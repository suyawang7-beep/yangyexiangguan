import {createReadonlyAdminClient} from './readonly-client.js';
export const connectAdmin=getToken=>createReadonlyAdminClient({getToken});
