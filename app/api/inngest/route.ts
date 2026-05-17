import { serve } from 'inngest/next';
import { inngest } from '@/inngest/client';
import { createMagicLink } from '@/inngest/functions/auth/create-magic-link';
import { unverifiedUserFollowup } from '@/inngest/functions/auth/unverified-user-followup';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [createMagicLink, unverifiedUserFollowup],
});
