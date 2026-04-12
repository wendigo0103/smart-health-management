import serverless from "serverless-http";

import { createApp } from "../../server";

export const handler = serverless(createApp());
