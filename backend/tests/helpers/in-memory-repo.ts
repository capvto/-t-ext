import {
  DuplicateIdError,
  type CreatePasteInput,
  type PasteEntity,
  type PasteRepository
} from '../../src/repositories/paste.repository';

function clonePaste(entity: PasteEntity): PasteEntity {
  return {
    ...entity,
    createdAt: new Date(entity.createdAt),
    updatedAt: new Date(entity.updatedAt)
  };
}

export class InMemoryPasteRepository implements PasteRepository {
  private readonly data = new Map<string, PasteEntity>();

  public async create(input: CreatePasteInput): Promise<PasteEntity> {
    if (this.data.has(input.id)) {
      throw new DuplicateIdError(input.id);
    }

    const entity: PasteEntity = {
      ...input,
      createdAt: new Date(input.createdAt),
      updatedAt: new Date(input.updatedAt)
    };

    this.data.set(input.id, entity);
    return clonePaste(entity);
  }

  public async findById(id: string): Promise<PasteEntity | null> {
    const entity = this.data.get(id);
    return entity ? clonePaste(entity) : null;
  }

  public async updateContent(id: string, content: string, updatedAt: Date): Promise<PasteEntity | null> {
    const existing = this.data.get(id);

    if (!existing) {
      return null;
    }

    const next: PasteEntity = {
      ...existing,
      content,
      updatedAt: new Date(updatedAt)
    };

    this.data.set(id, next);

    return clonePaste(next);
  }

  public async deleteById(id: string): Promise<boolean> {
    return this.data.delete(id);
  }
}
