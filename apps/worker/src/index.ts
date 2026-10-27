import { Queue } from "bullmq";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

const connection = { url: redisUrl };

export const rakebackQueue = new Queue("rakeback", { connection });
export const merkleQueue = new Queue("merkle-batching", { connection });
export const withdrawQueue = new Queue("withdraw", { connection });

export async function addRakebackJob(userId: string, amount: bigint) {
  await rakebackQueue.add("process", { userId, amount: amount.toString() });
}

export async function addMerkleJob(epoch: number, merkleRoot: string) {
  await merkleQueue.add("commit", { epoch, merkleRoot });
}

export async function addWithdrawJob(userId: string, amount: bigint, currency: string, address: string) {
  await withdrawQueue.add("process", { userId, amount: amount.toString(), currency, address });
}

async function main() {
  console.log("Worker initialized");
  console.log("Queues: rakeback, merkle-batching, withdraw");
}

main().catch(console.error);