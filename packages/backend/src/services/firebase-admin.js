import admin from "firebase-admin";
import fs from "fs/promises";
import { join } from "path";

const init = async () => {
  try {
    const credentialsPath =
      process.env.FIREBASE_CREDENTIALS_PATH ||
      join(process.cwd(), ".credentials/firebase.json");
    const serviceAccount = JSON.parse(
      await fs.readFile(credentialsPath, "utf-8"),
    );

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: "https://chef-book.firebaseio.com",
    });
  } catch (e) {
    if (
      process.env.NODE_ENV !== "test" &&
      process.env.NODE_ENV !== "selfhost"
    ) {
      console.error("Error while initializing firebase for notifications", e);
    }
  }
};

init();

export { admin };
