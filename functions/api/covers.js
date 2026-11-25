import {covers, withStorageErrors} from '../../server/cover-service.mjs';
export const onRequest = withStorageErrors(covers);
