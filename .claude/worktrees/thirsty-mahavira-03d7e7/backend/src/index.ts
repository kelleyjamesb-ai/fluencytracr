import { app } from "./app";
import { assertJwtSecretConfigured } from "./auth_secret";

const port = process.env.PORT ? Number(process.env.PORT) : 4000;
assertJwtSecretConfigured();
app.listen(port, () => {
  console.log(`Backend listening on ${port}`);
});
