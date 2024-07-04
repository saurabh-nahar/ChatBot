import dotenv from 'dotenv';
dotenv.config();

import express from "express";
import axios from "axios";
import { TELEGRAM_API} from "./constants.js";

const app = express();
app.use(express.json());

const port = 8080;

app.get('/', (req, res)=>{
  res.send("working")
})

app.post(`/`, async (req, res) => {
  const { message } = req.body;

  if (message && message.text) {
    const chatId = message.chat.id;
    const address = message.text;

    try {
      const moralisResponse = await axios.get(
        `https://deep-index.moralis.io/api/v2.2/wallets/${address}/tokens/`,
        {
          headers: {
            "X-API-Key": process.env.MORALIS_API_KEY,
          },
        }
      );
      const tokens = moralisResponse.data.result;

      let msg = "Tokens found:\n\n";
      tokens.forEach((token) => {
        if(token.possible_spam === true){
          return
        }
        const balance = parseFloat(token.balance_formatted);
        const value = parseFloat(token.usd_value);
        msg += `Coin: ${token.symbol}, Balance: ${balance.toFixed(
          2
        )}, Value: $${value.toFixed(2)}\n\n`;
      });
      await axios.post(`${TELEGRAM_API}${process.env.TOKEN}/sendMessage`, {
        chat_id: chatId,
        text: msg,
      });
    } catch (error) {
      console.error(
        "Error fetching data from Moralis API:",
        error.response ? error.response.data : error.message
      );
      await axios.post(`${TELEGRAM_API}${process.env.TOKEN}/sendMessage`, {
        chat_id: chatId,
        text: "Sorry, there was an error fetching the token data. Please check the address and try again.",
      });
    }
  }

  res.sendStatus(200);
});


app.listen(port, async () => {
  console.log(`Server is running on port ${port}`);

  try {
    const response = await axios.post(`${TELEGRAM_API}${process.env.TOKEN}/setWebhook`, {
      url: `${process.env.WEBHOOK_URL}`,
    });
    if (response.data.ok) {
      console.log("Webhook set successfully");
    } else {
      console.error("Failed to set webhook:", response.data.description);
    }
  } catch (error) {
    console.error("Error setting webhook:", error);
  }
});
