import fastify from "fastify";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { z } from "zod";
import { randomUUID } from "crypto";
import { PrismaClient } from "@prisma/client";

import { r2 } from "./lib/cloudflare";

const server = fastify();
const prisma = new PrismaClient();

server.post("/upload", async (req, res) => {

	const uploadBodySchema = z.object({
		name: z.string().min(1),
		contentType: z.string().regex(/\w+\/[-+.\w]+/)
	});
	const { name, contentType } = uploadBodySchema.parse(req.body);
	const fileKey = randomUUID().concat("-").concat(name);

	const signedUrl = await getSignedUrl(
		r2,
		new PutObjectCommand({
			Bucket: "timerfiles",
			Key: fileKey,
			ContentType: contentType
		}), {expiresIn: 240}
	);

	await prisma.file.create({
		data: {
			name,
			contentType,
			key: fileKey
		}
	});

	return res.status(201).send({ fileKey, contentType, signedUrl });
});

server.listen({
	port: 8080,
	host: "0.0.0.0"
}).then(() =>
	console.log("HTTP server running.")
);