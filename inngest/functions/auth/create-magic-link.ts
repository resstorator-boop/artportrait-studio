import { inngest } from '@/inngest/client';

// Triggered by process-payment via auth/create_magic_link.
// Реальная реализация в Этапе 4 (Unisender Go + createMagicLinkToken).
export const createMagicLink = inngest.createFunction(
  { id: 'create-magic-link', name: 'Create Magic Link', triggers: [{ event: 'auth/create_magic_link' }] },
  async ({ event, step }: { event: { data: { userId: string; orderId: string; email: string } }; step: { sendEvent: (id: string, payload: { name: string; data: unknown }) => Promise<void> } }) => {
    // TODO Этап 4:
    // 1. Найти user в DB по event.data.userId
    // 2. Если нет clerkId — создать Clerk user через clerkClient().users.createUser()
    // 3. Обновить users.clerk_id в DB
    // 4. createMagicLinkToken(clerkUserId) → { token, url }
    // 5. Отправить email через lib/email/unisender.ts
    // 6. INSERT events: type='magic_link.email_sent'

    await step.sendEvent('schedule-followup', {
      name: 'auth/magic_link.followup',
      data: { userId: (event.data as { userId: string }).userId },
    });
  },
);
