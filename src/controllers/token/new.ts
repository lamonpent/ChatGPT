import api from "../../config/axios"
import TokenData from "../../models/token"
import dotenv from "dotenv"
import { Request, Response } from "express"

dotenv.config()

export const generate = async (req: Request, res: Response) => {
  try {
    const { code, redirect_uri, grant_type } = req.body

    const client_secret = process.env.CLIENT_SECRET
    if (!client_secret)
      throw new Error("can't find CLIENT_SECRET .env variable")
    const client_id = process.env.CLIENT_ID
    if (!client_id) throw new Error("can't find CLIENT_ID .env variable")

    const notionRes = await api.post(
      "/oauth/token",
      {
        code,
        redirect_uri,
        grant_type,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${Buffer.from(
            `${client_id}:${client_secret}`
          ).toString("base64")}`,
        },
      }
    )
    const id = `${notionRes.data.workspace_id}:${
      notionRes.data.owner.workspace ? "x" : notionRes.data.owner.user.id
    }`
    // because of the cold start, users may dispatch the request more than once
    // so we need to delete the old data
    // this will be fixed by upgrading the backend instance to a paid one
    await TokenData.deleteMany({
      id,
    })
    await TokenData.create({
      ...notionRes.data,
      id,
    })
    res.status(200).send(notionRes.data)
  } catch (err) {
    console.error(err)
    res.status(500).send({
      message: "Something went wrong",
      error: JSON.stringify(err),
    })
  }
}
