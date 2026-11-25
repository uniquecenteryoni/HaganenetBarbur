import {session, withStorageErrors} from '../../server/cover-service.mjs';
export const onRequest = withStorageErrors(session);
