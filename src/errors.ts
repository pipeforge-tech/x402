export type ErrorCode =
  | 'INVALID_TARGET'
  | 'FORBIDDEN_TARGET'
  | 'DNS_FAILURE'
  | 'TIMEOUT'
  | 'UNREACHABLE'
  | 'TLS_FAILURE'
  | 'INTERNAL_ERROR';

const statusByCode: Record<ErrorCode, number> = {
  INVALID_TARGET: 400,
  FORBIDDEN_TARGET: 403,
  DNS_FAILURE: 422,
  TIMEOUT: 504,
  UNREACHABLE: 502,
  TLS_FAILURE: 502,
  INTERNAL_ERROR: 500,
};

export class InspectionError extends Error {
  readonly status: number;

  constructor(
    readonly code: ErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'InspectionError';
    this.status = statusByCode[code];
  }
}

export function publicError(error: unknown): {
  status: number;
  body: { error: { code: ErrorCode; message: string } };
} {
  if (error instanceof InspectionError) {
    return { status: error.status, body: { error: { code: error.code, message: error.message } } };
  }
  return {
    status: 500,
    body: { error: { code: 'INTERNAL_ERROR', message: 'Inspection failed unexpectedly' } },
  };
}
