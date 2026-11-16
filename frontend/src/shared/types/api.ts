export type PayloadBody<T extends FormData | object> = {
  body: T;
};

export type PayloadQuery<T extends object> = {
  query?: T;
};
