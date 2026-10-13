-- DevChat: broadcast inserts over Realtime and seed the default rooms.

alter publication supabase_realtime add table public.chat_rooms, public.chat_messages;

insert into public.chat_rooms (slug, name, description) values
  ('general', 'General', 'Say hi, introduce yourself and share what you are building this week.'),
  ('frontend', 'Frontend', 'React, CSS, accessibility, performance and everything that runs in the browser.'),
  ('backend', 'Backend', 'APIs, databases, queues, caching and keeping servers fast and boring.'),
  ('interview-prep', 'Interview Prep', 'DSA practice, system design rounds, mock interviews and offer negotiation tips.'),
  ('open-source', 'Open Source', 'Good first issues, PR reviews, maintainer life and projects looking for contributors.'),
  ('random', 'Random', 'Off-topic chatter, desk setups, music for focus and the occasional meme.');
