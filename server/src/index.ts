import { env } from './config/env';
import { createApp } from './app/createApp';

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`DashForge server listening on port ${env.PORT}`);
});
