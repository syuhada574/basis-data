import { supabase } from './supabase.js';

const Realtime = {
  // Generic helper for postgres changes subscriptions
  subscribeTable({
    channelName,
    schema = 'public',
    table,
    filter = null, // e.g. 'order_id=eq.<uuid>'
    event = '*',
    onChange,
  }) {
    const payloadFilter = filter ? { filter } : undefined;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event,
          schema,
          table,
          // Supabase expects a "filter" string format; keep it optional.
          ...(payloadFilter ? { ...payloadFilter } : {}),
        },
        onChange
      )
      .subscribe();

    return channel;
  },
};

export { Realtime };

