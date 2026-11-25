import {driveProducts} from '../../server/shop-service.mjs';
import {withStorageErrors} from '../../server/cover-service.mjs';
export const onRequest = withStorageErrors(driveProducts);
