# Astalanty MVP Deploy e Seed na Arbitrum Sepolia

## Objetivo

Publicar o núcleo econômico do MVP técnico, criar uma Smart Account do deployer, abastecer essa conta com Mock USDC, aprovar o Paymaster e executar uma operação demo `sponsorDemoOperation`.

## Pré-requisitos

- Carteira MetaMask com ETH de teste na Arbitrum Sepolia.
- Chave privada da carteira de deploy salva somente no arquivo `.env` local.
- Dependências instaladas com `pnpm install`.

## Variáveis `.env`

Copie `.env.example` para `.env` e preencha:

```env
ARBITRUM_SEPOLIA_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
DEPLOYER_PRIVATE_KEY=cole_sua_chave_privada_sem_aspas
MVP_TREASURY_ADDRESS=cole_o_endereco_da_treasury_ou_deixe_vazio_para_usar_o_deployer
MVP_ENTRY_POINT_ADDRESS=cole_o_entrypoint_ou_deixe_vazio_para_demo
MVP_RECOVERY_GUARDIAN_ADDRESS=cole_o_guardian_ou_deixe_vazio_para_usar_o_deployer
```

Para o MVP visual, `MVP_ENTRY_POINT_ADDRESS` pode ficar vazio. O script usará o deployer como fallback de demonstração, mantendo compatibilidade com a demonstração sem EntryPoint ERC-4337 real.

## Comandos

Rodar validação local:

```powershell
cd packages/contracts
pnpm build
pnpm test
pnpm deploy:local
```

Rodar deploy na Arbitrum Sepolia:

```powershell
cd packages/contracts
pnpm deploy:arbitrum-sepolia
```

## Checklist Visual

1. Confirmar que `.env` existe na raiz do projeto.
2. Confirmar que `DEPLOYER_PRIVATE_KEY` está preenchida.
3. Confirmar que a carteira tem ETH de teste na Arbitrum Sepolia.
4. Rodar `pnpm build`.
5. Rodar `pnpm test`.
6. Rodar `pnpm deploy:arbitrum-sepolia`.
7. Ver no terminal os endereços dos contratos.
8. Abrir `packages/contracts/deployments`.
9. Confirmar que existe um arquivo `arbitrumSepolia-421614-latest.json`.
10. Conferir no JSON:
    - `MockUSDC`;
    - `AUSDToken`;
    - `AstalantyFeeManager`;
    - `AstalantyPaymaster`;
    - `AstalantySmartAccountFactory`;
    - `AstalantySmartAccount`;
    - `demoOperation.operationId`;
    - saldo de Mock USDC na treasury;
    - saldo de AUSD na treasury.

## O que o script executa

1. Deploy de `MockUSDC`.
2. Deploy de `AUSDToken`.
3. Deploy de `AstalantyFeeManager`.
4. Deploy de `AstalantyPaymaster`.
5. Deploy de `AstalantySmartAccountFactory`.
6. Permissão de minter de AUSD para o Fee Manager.
7. Autorização do Paymaster no Fee Manager.
8. Criação da Smart Account do deployer.
9. Mint de Mock USDC para a Smart Account.
10. Approve do Paymaster via `SmartAccount.execute`.
11. Execução de `sponsorDemoOperation`.
12. Registro do resultado em JSON.

## Saída

O script grava dois arquivos:

- `packages/contracts/deployments/<network>-<chainId>-<timestamp>.json`;
- `packages/contracts/deployments/<network>-<chainId>-latest.json`.

## Limitações Conscientes

- O script usa o deployer como fallback de `EntryPoint` quando `MVP_ENTRY_POINT_ADDRESS` não é informado.
- `sponsorDemoOperation` é uma operação demonstrativa do fluxo econômico, não uma execução ERC-4337 completa.
- Mock USDC e AUSD são ativos de testnet, sem valor financeiro real.
- O deploy não verifica contratos em explorer automaticamente.
- A operação demo usa uma hash gerada no momento do deploy para evitar colisão de operação.
