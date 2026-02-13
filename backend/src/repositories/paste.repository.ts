import { Prisma, PrismaClient } from '@prisma/client';

export type PasteEntity = {
  id: string;
  title: string;
  content: string;
  editHash: string;
  createdAt: Date;
  updatedAt: Date;
};

export type CreatePasteInput = {
  id: string;
  title: string;
  content: string;
  editHash: string;
  createdAt: Date;
  updatedAt: Date;
};

export class DuplicateIdError extends Error {
  public constructor(id: string) {
    super(`Duplicate id: ${id}`);
    this.name = 'DuplicateIdError';
  }
}

export interface PasteRepository {
  create(input: CreatePasteInput): Promise<PasteEntity>;
  findById(id: string): Promise<PasteEntity | null>;
  updateContent(id: string, content: string, updatedAt: Date): Promise<PasteEntity | null>;
  deleteById(id: string): Promise<boolean>;
}

export class PrismaPasteRepository implements PasteRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async create(input: CreatePasteInput): Promise<PasteEntity> {
    try {
      return await this.prisma.paste.create({
        data: {
          id: input.id,
          title: input.title,
          content: input.content,
          editHash: input.editHash,
          createdAt: input.createdAt,
          updatedAt: input.updatedAt
        }
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new DuplicateIdError(input.id);
      }

      throw error;
    }
  }

  public async findById(id: string): Promise<PasteEntity | null> {
    return this.prisma.paste.findUnique({ where: { id } });
  }

  public async updateContent(id: string, content: string, updatedAt: Date): Promise<PasteEntity | null> {
    try {
      return await this.prisma.paste.update({
        where: { id },
        data: {
          content,
          updatedAt
        }
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        return null;
      }

      throw error;
    }
  }

  public async deleteById(id: string): Promise<boolean> {
    try {
      await this.prisma.paste.delete({ where: { id } });
      return true;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        return false;
      }

      throw error;
    }
  }
}
