import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createPublicClient,
  createWalletClient,
  http,
  hexToString,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';

import * as tokenJson from './assets/BallotToken.json';
import * as ballotJson from './assets/TokenizedBallot.json';

@Injectable()
export class AppService {
  publicClient;
  walletClient;

  constructor(private configService: ConfigService) {
    const account = privateKeyToAccount(
      `0x${this.configService.get<string>('PRIVATE_KEY')}`,
    );

    this.publicClient = createPublicClient({
      chain: sepolia,
      transport: http(this.configService.get<string>('RPC_ENDPOINT_URL')),
    });

    this.walletClient = createWalletClient({
      transport: http(this.configService.get<string>('RPC_ENDPOINT_URL')),
      chain: sepolia,
      account: account,
    });
  }

  getTokenContractAddress(): string {
    return this.configService.get<string>('TOKEN_ADDRESS');
  }

  getBallotContractAddress(): string {
    const ballotAddress = this.configService.get<string>('BALLOT_ADDRESS');
    return ballotAddress;
  }

  async getTokenName(): Promise<string> {
    const name = await this.publicClient.readContract({
      address: (this.getTokenContractAddress() ?? '') as `0x${string}`,
      abi: tokenJson.abi,
      functionName: 'name',
    });
    return name as string;
  }

  async getTotalSupply(): Promise<string> {
    const supply = await this.publicClient.readContract({
      address: this.getTokenContractAddress() as `0x${string}`,
      abi: tokenJson.abi,
      functionName: 'totalSupply',
    });
    return supply.toString();
  }

  async getTokenBalance(address: string): Promise<string> {
    const balance = await this.publicClient.readContract({
      address: this.getTokenContractAddress() as `0x${string}`,
      abi: tokenJson.abi,
      functionName: 'balanceOf',
      args: [address],
    });
    return balance.toString();
  }

  async getTransactionReceipt(hash: string) {
    return await this.publicClient.getTransactionReceipt({
      hash: hash as `0x${string}`,
    });
  }

  getServerWalletAddress(): string {
    return this.walletClient.account.address;
  }

  async checkMinterRole(address: string): Promise<boolean> {
    const MINTER_ROLE =
      '0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6';
    const hasRole = await this.publicClient.readContract({
      address: this.getTokenContractAddress() as `0x${string}`,
      abi: tokenJson.abi,
      functionName: 'hasRole',
      args: [MINTER_ROLE, address],
    });
    return hasRole as boolean;
  }

  async mintTokens(address: string): Promise<string> {
    const { request } = await this.publicClient.simulateContract({
      address: this.getTokenContractAddress() as `0x${string}`,
      abi: tokenJson.abi,
      functionName: 'mint',
      args: [address, BigInt(1000000000000000000n)], // Minting 1 token with 18 decimals
      account: this.walletClient.account,
    });

    const hash = await this.walletClient.writeContract(request);
    return hash;
  }

  async getWinnerName(): Promise<string> {
    const name = await this.publicClient.readContract({
      address: this.getBallotContractAddress() as `0x${string}`,
      abi: ballotJson.abi,
      functionName: 'winnerName',
    });
    return hexToString(name) as string;
  }
}
