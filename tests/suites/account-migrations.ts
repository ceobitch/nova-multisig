import assert from "assert";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import * as multisig from "@sqds/multisig";
import { createLocalhostConnection, getTestProgramId } from "../utils";

const { Multisig } = multisig.accounts;
const { toBigInt } = multisig.utils;

const programId = getTestProgramId();

describe("Account Schema Migrations", () => {
  const connection = createLocalhostConnection();

  it("Multisig account created before introduction of rent_collector field should load by program", async () => {
    // Generate a new keypair for testing
    const memberKeypair = Keypair.generate();
    // Fund the member wallet.
    const tx = await connection.requestAirdrop(
      memberKeypair.publicKey,
      1 * LAMPORTS_PER_SOL
    );
    await connection.confirmTransaction(tx);

    // This is the account that was created before the `rent_collector` field was added to the schema.
    const oldMultisigPda = new PublicKey(
      "D3oQ6QxSYk6aKUsmBTa9BghFQvbRi7kxP6h95NSdjjXz"
    );

    // Should deserialize with the latest SDK.
    const oldMultisigAccount = await Multisig.fromAccountAddress(
      connection,
      oldMultisigPda
    );

    // Should deserialize `rent_collector` as null.
    assert.equal(oldMultisigAccount.rentCollector, null);

    // Should work with the latest version of the program.
    // This transaction will fail if the program cannot deserialize the multisig account.
    const sig = await multisig.rpc.configTransactionCreate({
      connection,
      multisigPda: oldMultisigPda,
      feePayer: memberKeypair,
      transactionIndex: toBigInt(oldMultisigAccount.transactionIndex) + 1n,
      actions: [{ __kind: "SetTimeLock", newTimeLock: 300 }],
      creator: memberKeypair.publicKey,
      rentPayer: memberKeypair.publicKey,
      programId,
    });
    await connection.confirmTransaction(sig);
  });
});
