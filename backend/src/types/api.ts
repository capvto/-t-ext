export type PublishRequest = {
  title?: string;
  content: string;
  slug?: string;
};

export type PublishResponse = {
  id: string;
  editCode: string;
  viewUrl: string;
};

export type PasteResponse = {
  id: string;
  title: string;
  content: string;
  createdAt?: string;
  updatedAt?: string;
};

export type UpdateRequest = {
  id: string;
  editCode: string;
  content: string;
};

export type UpdateResponse = {
  ok: true;
  updatedAt?: string;
};

export type DeleteRequest = {
  id: string;
  editCode: string;
};

export type DeleteResponse = {
  ok: true;
};

export type ErrorResponse = {
  error: string;
};
