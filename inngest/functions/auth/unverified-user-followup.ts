import { inngest } from '@/inngest/client';

// 3-step retry для неактивированных пользователей.
// Реальная реализация в Этапе 5.
// Идемпотентность по (user_id, step_name) обеспечивается Inngest step keys.
export const unverifiedUserFollowup = inngest.createFunction(
  { id: 'unverified-user-followup', name: 'Unverified User Followup', triggers: [{ event: 'auth/magic_link.followup' }] },
  async ({ event: _event, step: _step }: { event: { data: { userId: string } }; step: { sleep: (id: string, duration: string) => Promise<void> } }) => {
    // TODO Этап 5:
    // const { userId } = event.data;
    //
    // Step 1 — через 24ч
    // await step.sleep('wait-24h', '24h');
    // Ранний выход: если pending_registration = false — return
    // Отправить magic_link_reminder email
    //
    // Step 2 — ещё через 48ч
    // await step.sleep('wait-48h', '48h');
    // Ранний выход: если pending_registration = false — return
    // Отправить magic_link_final email
    //
    // Step 3 — ещё через 11 дней (итого 14д от оплаты)
    // await step.sleep('wait-11d', '11d');
    // Ранний выход: если pending_registration = false — return
    // INSERT events: type='magic_link.admin_alert'
  },
);
