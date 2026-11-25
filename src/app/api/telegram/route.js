import { bot } from "@/lib/telegram";
import { runAgent } from "@/lib/agent";
import { after } from "next/server";

export const maxDuration = 60;

bot.on("message:text", async (ctx) => {

  await ctx.replyWithChatAction("typing");
  const progressMessage = await ctx.reply(
    "🤔 Understanding your request..."
  );

  try {
    const updateProgress = async (message) => {
      try {
        await ctx.api.editMessageText(
        ctx.chat.id,
        progressMessage.message_id,
        `⚙️ ${message}`
      );

      } catch (error) {
        console.error("Progress update failed:", error);
      }
    };

    const response = await runAgent(ctx.message.text, updateProgress, ctx.from.username);
    await updateProgress(`✅ Done!\n\n${response}`);
  } catch (error) {
    console.error(error);
    await ctx.reply("Error: " + error.message);
  }
});

export async function POST(req) {
  try {
    const update = await req.json();
    await bot.init()

    // Process the update in the background after responding
    after(async () => {
      try {
        await bot.handleUpdate(update);
      } catch (err) {
        console.error("Error handling update in after():", err);
      }
    });

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response("Error", { status: 500 });
  }
}
