export enum RequestStatus {
  OK = 'OK',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  FETCH_ERROR = 'FETCH_ERROR',
  PARSE_ERROR = 'PARSE_ERROR',
  BAD_STATUS_CODE = 'BAD_STATUS_CODE',
  FETCH_TIMEOUT = 'FETCH_TIMEOUT',
  REFUSED_LARGE_FEED = 'REFUSED_LARGE_FEED',
  MATCHED_HASH = 'MATCHED_HASH',
  INVALID_SSL_CERTIFICATE = 'INVALID_SSL_CERTIFICATE',
}
