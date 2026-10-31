import {waitUntil, ipAddress} from '@vercel/functions';
import {createHandler} from '../platform/vercel-handler.mjs';

// Vercel does not supply the Cloudflare env or ExecutionContext arguments.
export default {fetch:createHandler({defer:waitUntil,clientIP:ipAddress})};
