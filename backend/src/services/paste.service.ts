import type { Env } from '../config/env';
import type {
  DeleteRequest,
  DeleteResponse,
  PasteResponse,
  PublishRequest,
  PublishResponse,
  UpdateRequest,
  UpdateResponse
} from '../types/api';
import { HttpError, MAX_CONTENT_LENGTH, MAX_TITLE_LENGTH } from '../utils/http';
import { generateEditCode, generatePasteId } from '../utils/id';
import { sha256Hex, verifySecretAgainstHash } from '../utils/hash';
import { normalizeSlug, validateNormalizedSlug } from '../utils/slug';
import { buildViewUrl } from '../utils/view-url';
import { DuplicateIdError, type PasteEntity, type PasteRepository } from '../repositories/paste.repository';

const MAX_ID_GENERATION_ATTEMPTS = 12;

type RequestMeta = {
  forwardedProto?: string | string[];
  forwardedHost?: string | string[];
};

export class PasteService {
  public constructor(
    private readonly repository: PasteRepository,
    private readonly env: Env
  ) {}

  public async publish(input: PublishRequest, meta: RequestMeta): Promise<PublishResponse> {
    const content = String(input.content ?? '');

    if (!content.trim()) {
      throw new HttpError(400, 'Empty content');
    }

    if (content.length > MAX_CONTENT_LENGTH) {
      throw new HttpError(413, 'Content too large');
    }

    const title = typeof input.title === 'string' ? input.title.slice(0, MAX_TITLE_LENGTH) : '';
    const now = new Date();

    const rawSlug = typeof input.slug === 'string' ? input.slug : '';
    const hasRequestedSlug = rawSlug.trim().length > 0;

    let id = '';

    if (hasRequestedSlug) {
      const normalized = normalizeSlug(rawSlug);
      const result = validateNormalizedSlug(normalized);

      if (!result.ok) {
        throw new HttpError(400, result.error);
      }

      id = normalized;
      const editCode = generateEditCode();

      try {
        await this.repository.create({
          id,
          title,
          content,
          editHash: sha256Hex(editCode),
          createdAt: now,
          updatedAt: now
        });
      } catch (error) {
        if (error instanceof DuplicateIdError) {
          throw new HttpError(409, 'This link is already in use');
        }

        throw error;
      }

      return {
        id,
        editCode,
        viewUrl: buildViewUrl({
          id,
          publicBaseUrl: this.env.PUBLIC_BASE_URL,
          trustProxy: this.env.TRUST_PROXY,
          forwardedProto: meta.forwardedProto,
          forwardedHost: meta.forwardedHost,
          forwardedHostAllowlist: this.env.FORWARDED_HOST_ALLOWLIST,
          isProduction: this.env.NODE_ENV === 'production'
        })
      };
    }

    const editCode = generateEditCode();
    const editHash = sha256Hex(editCode);

    for (let attempt = 0; attempt < MAX_ID_GENERATION_ATTEMPTS; attempt += 1) {
      id = generatePasteId();

      try {
        await this.repository.create({
          id,
          title,
          content,
          editHash,
          createdAt: now,
          updatedAt: now
        });

        return {
          id,
          editCode,
          viewUrl: buildViewUrl({
            id,
            publicBaseUrl: this.env.PUBLIC_BASE_URL,
            trustProxy: this.env.TRUST_PROXY,
            forwardedProto: meta.forwardedProto,
            forwardedHost: meta.forwardedHost,
            forwardedHostAllowlist: this.env.FORWARDED_HOST_ALLOWLIST,
            isProduction: this.env.NODE_ENV === 'production'
          })
        };
      } catch (error) {
        if (error instanceof DuplicateIdError) {
          continue;
        }

        throw error;
      }
    }

    throw new HttpError(500, 'Could not allocate a unique id');
  }

  public async getPaste(id: string): Promise<PasteResponse> {
    const normalizedId = String(id ?? '').trim();

    if (!normalizedId) {
      throw new HttpError(400, 'Missing id');
    }

    const paste = await this.repository.findById(normalizedId);

    if (!paste) {
      throw new HttpError(404, 'Not found');
    }

    return this.toPasteResponse(paste);
  }

  public async update(input: UpdateRequest): Promise<UpdateResponse> {
    const id = String(input.id ?? '').trim();
    const editCode = String(input.editCode ?? '');
    const content = String(input.content ?? '');

    if (!id) {
      throw new HttpError(400, 'Missing id');
    }

    if (!editCode) {
      throw new HttpError(401, 'Missing edit code');
    }

    if (!content.trim()) {
      throw new HttpError(400, 'Empty content');
    }

    if (content.length > MAX_CONTENT_LENGTH) {
      throw new HttpError(413, 'Content too large');
    }

    const existing = await this.repository.findById(id);

    if (!existing) {
      throw new HttpError(404, 'Not found');
    }

    if (!verifySecretAgainstHash(existing.editHash, editCode)) {
      throw new HttpError(403, 'Invalid edit code');
    }

    const now = new Date();
    const updated = await this.repository.updateContent(id, content, now);

    if (!updated) {
      throw new HttpError(404, 'Not found');
    }

    return {
      ok: true,
      updatedAt: now.toISOString()
    };
  }

  public async delete(input: DeleteRequest): Promise<DeleteResponse> {
    const id = String(input.id ?? '').trim();
    const editCode = String(input.editCode ?? '');

    if (!id) {
      throw new HttpError(400, 'Missing id');
    }

    if (!editCode) {
      throw new HttpError(401, 'Missing edit code');
    }

    const existing = await this.repository.findById(id);

    if (!existing) {
      throw new HttpError(404, 'Not found');
    }

    if (!verifySecretAgainstHash(existing.editHash, editCode)) {
      throw new HttpError(403, 'Invalid edit code');
    }

    const deleted = await this.repository.deleteById(id);

    if (!deleted) {
      throw new HttpError(404, 'Not found');
    }

    return { ok: true };
  }

  private toPasteResponse(paste: PasteEntity): PasteResponse {
    return {
      id: paste.id,
      title: paste.title ?? '',
      content: paste.content ?? '',
      createdAt: paste.createdAt?.toISOString(),
      updatedAt: paste.updatedAt?.toISOString()
    };
  }
}
