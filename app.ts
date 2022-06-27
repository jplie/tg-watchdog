import Dotenv from "dotenv"
import { Bot, Context } from "grammy"
import { Fluent } from "@moebius/fluent"
import { FluentContextFlavor, useFluent } from "@grammyjs/fluent"
import Debug from "debug"
import utils from "./utils"

const print = Debug("tgwd:app.ts")

const fluent = new Fluent()
Dotenv.config()

const initialLocales = async () =>{
  await fluent.addTranslation({
    locales: "zh-hans",
    filePath: ["./locales/zh-hans/messages.ftl"]
  })
  await fluent.addTranslation({
    locales: "en",
    filePath: ["./locales/en/messages.ftl"]
  })
}
initialLocales()
export type BotContext = ( & Context & FluentContextFlavor )

if (!process.env.TGWD_TOKEN) {
  throw(new Error("You must define TGWD_TOKEN (Telegram bot token) to use this bot."))
}
if (!process.env.TGWD_FRONTEND_DOMAIN) {
  throw(new Error("You must define TGWD_FRONTEND_DOMAIN (Frontend verify domain) to use this bot."))
}
if (!process.env.TGWD_SECRET) {
  throw(new Error("You must define TGWD_SECRET (signature secret) to use this bot."))
}
const bot = new Bot<BotContext>(process.env.TGWD_TOKEN || "")

bot.use(useFluent({ fluent, defaultLocale: "en"}))

bot.command("start", async ctx => {
  await ctx.reply(ctx.t("welcome_body"), {
    disable_web_page_preview: true,
    reply_markup: {
      inline_keyboard: [[
        {
          text: ctx.t("welcome_setmeasadmin"),
          url: `https://t.me/${ctx.me.username}?startgroup=start&admin=can_invite_users`
        }
      ]]
    }
  })
})

bot.on("chat_join_request", async ctx => {
  const msg = await bot.api.sendMessage(ctx.from.id, `${ctx.t("verify_message", {groupname: ctx.chat.title})}\n${ctx.t("verify_loading")}`)
  const timestamp = new Date().getTime()
  const msgId = msg.message_id
  const signature = await utils.signature(msgId, ctx.chat.id, ctx.from.id, timestamp)
  const url = `https://${process.env.TGWD_FRONTEND_DOMAIN}/?chat_id=${ctx.chat.id}&msg_id=${msgId}&timestamp=${timestamp}&signature=${signature}`
  bot.api.editMessageText(
    ctx.from.id, msgId,
    `${ctx.t("verify_message", {groupname: ctx.chat.title})}\n${ctx.t("verify_info")}`,
    {
      reply_markup: {
        inline_keyboard: [[{
          text: ctx.t("verify_btn"),
          web_app: {
            url: url
          }
        }]]
      }
    }
  )
})

bot.catch(async err => {
  print("Error detected while running the bot!")
  print(err)
})

bot.start()