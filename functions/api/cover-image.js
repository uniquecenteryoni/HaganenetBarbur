import {image, withStorageErrors} from '../../server/cover-service.mjs';
export const onRequest = withStorageErrors(image);
