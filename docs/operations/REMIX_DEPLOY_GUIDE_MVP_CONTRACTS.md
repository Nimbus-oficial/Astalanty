# Guia Visual Remix — Deploy dos Contratos MVP Astalanty

## Objetivo

Publicar no Remix IDE os contratos do núcleo econômico MVP:

1. `MockUSDC`
2. `AUSDToken`
3. `AstalantyFeeManager`
4. `AstalantyPaymaster`
5. `AstalantySmartAccountFactory`
6. `AstalantySmartAccount`, criada pela Factory

Rede alvo:

```text
Arbitrum Sepolia Testnet
```

---

# Parte 1 — Preparar MetaMask

1. Abra a MetaMask.
2. Selecione a rede **Arbitrum Sepolia**.
3. Garanta que sua carteira tenha ETH de teste na Arbitrum Sepolia.

Dados úteis da rede:

```text
Network: Arbitrum Sepolia
Chain ID: 421614
Currency: ETH
Explorer: https://sepolia.arbiscan.io
```

---

# Parte 2 — Abrir Remix

1. Acesse `https://remix.ethereum.org`.
2. Clique em **File Explorer**.
3. Crie uma pasta chamada:

```text
astalanty-mvp
```

4. Dentro dela, crie estes arquivos:

```text
MockUSDC.sol
AUSDToken.sol
AstalantyFeeManager.sol
AstalantyPaymaster.sol
AstalantySmartAccount.sol
AstalantySmartAccountFactory.sol
```

5. Copie o conteúdo dos arquivos locais correspondentes:

```text
packages/contracts/contracts/MockUSDC.sol
packages/contracts/contracts/AUSDToken.sol
packages/contracts/contracts/AstalantyFeeManager.sol
packages/contracts/contracts/AstalantyPaymaster.sol
packages/contracts/contracts/AstalantySmartAccount.sol
packages/contracts/contracts/AstalantySmartAccountFactory.sol
```

---

# Parte 3 — Compilar

1. Clique no ícone **Solidity Compiler**.
2. Selecione a versão:

```text
0.8.28
```

3. Ative **Auto compile**, se desejar.
4. Compile os contratos nesta ordem:

```text
MockUSDC.sol
AUSDToken.sol
AstalantyFeeManager.sol
AstalantyPaymaster.sol
AstalantySmartAccount.sol
AstalantySmartAccountFactory.sol
```

Se aparecer import do OpenZeppelin, aguarde o Remix carregar as dependências automaticamente.

---

# Parte 4 — Deploy

Clique em **Deploy & Run Transactions**.

Em **Environment**, selecione:

```text
Injected Provider - MetaMask
```

Confirme que a rede exibida é:

```text
421614
```

Use sempre sua carteira como `initialOwner`.

## 1. Deploy MockUSDC

Contrato:

```text
MockUSDC
```

Constructor:

```text
initialOwner = seu endereço MetaMask
```

Após deploy, copie o endereço do `MockUSDC`.

## 2. Deploy AUSDToken

Contrato:

```text
AUSDToken
```

Constructor:

```text
initialOwner = seu endereço MetaMask
```

Após deploy, copie o endereço do `AUSDToken`.

## 3. Deploy AstalantyFeeManager

Contrato:

```text
AstalantyFeeManager
```

Constructor:

```text
initialOwner        = seu endereço MetaMask
ausd_               = endereço do AUSDToken
mockUsdc_           = endereço do MockUSDC
treasury_           = seu endereço MetaMask
usdcToAusdRate_     = 1000000000000000000
baseGasMarkupBps_   = 0
minAusdFee_         = 1000000000000000
maxAusdFee_         = 10000000000000000000
```

Significado dos valores:

```text
usdcToAusdRate_ = 1 Mock USDC para 1 AUSD
baseGasMarkupBps_ = sem markup
minAusdFee_ = 0.001 AUSD
maxAusdFee_ = 10 AUSD
```

Após deploy, copie o endereço do `AstalantyFeeManager`.

## 4. Deploy AstalantyPaymaster

Contrato:

```text
AstalantyPaymaster
```

Constructor:

```text
initialOwner          = seu endereço MetaMask
entryPoint_           = seu endereço MetaMask
feeManager_           = endereço do AstalantyFeeManager
mockUsdc_             = endereço do MockUSDC
treasury_             = seu endereço MetaMask
maxCostPerOperation_  = 0
```

Observação:

Para o MVP no Remix, `entryPoint_` pode ser temporariamente o endereço da sua carteira para testes visuais. Na implementação ERC-4337 real, este campo deverá ser o contrato EntryPoint.

Após deploy, copie o endereço do `AstalantyPaymaster`.

## 5. Deploy AstalantySmartAccountFactory

Contrato:

```text
AstalantySmartAccountFactory
```

Constructor:

```text
initialOwner = seu endereço MetaMask
entryPoint_  = seu endereço MetaMask
```

Observação:

Para o MVP visual no Remix, `entryPoint_` pode ser temporariamente sua carteira. No fluxo ERC-4337 real, deverá ser o contrato EntryPoint.

Após deploy, copie o endereço da `AstalantySmartAccountFactory`.

## 6. Criar AstalantySmartAccount

No contrato `AstalantySmartAccountFactory`, chame:

```text
createAccount(owner, recoveryGuardian)
```

Valores:

```text
owner = seu endereço MetaMask
recoveryGuardian = seu endereço MetaMask
```

Depois consulte:

```text
accountOfOwner(seu endereço MetaMask)
```

Esse será o endereço da sua Smart Account.

---

# Parte 5 — Configurar Permissões

## AUSDToken

No contrato `AUSDToken`, chame:

```text
setMinter(feeManagerAddress, true)
```

Onde:

```text
feeManagerAddress = endereço do AstalantyFeeManager
```

## AstalantyFeeManager

No contrato `AstalantyFeeManager`, chame:

```text
setAuthorizedPaymaster(paymasterAddress)
```

Onde:

```text
paymasterAddress = endereço do AstalantyPaymaster
```

## MockUSDC

No contrato `MockUSDC`, chame:

```text
mint(seuEndereco, 1000000000)
```

Isso cria:

```text
1000 Mock USDC
```

porque o Mock USDC usa 6 decimais.

Depois aprove o Paymaster:

```text
approve(paymasterAddress, 1000000000)
```

---

# Parte 6 — Teste Visual do Fluxo MVP

No contrato `AstalantyPaymaster`, chame:

```text
sponsorDemoOperation(
  userOpHash,
  account,
  payer,
  verificationGasLimit,
  callGasLimit,
  preVerificationGas,
  maxFeePerGas
)
```

Valores sugeridos:

```text
userOpHash            = 0x1111111111111111111111111111111111111111111111111111111111111111
account               = seu endereço MetaMask
payer                 = seu endereço MetaMask
verificationGasLimit  = 100000
callGasLimit          = 100000
preVerificationGas    = 50000
maxFeePerGas          = 1000000000
```

Resultado esperado:

1. O Paymaster recebe autorização.
2. O Paymaster transfere Mock USDC da sua carteira para a treasury.
3. O Fee Manager calcula a taxa.
4. O Fee Manager liquida em AUSD.
5. O AUSD é mintado para a treasury.
6. Eventos são emitidos nos contratos.

---

# Parte 7 — Verificar Resultado

No `MockUSDC`, consulte:

```text
balanceOf(seuEndereco)
```

No `AUSDToken`, consulte:

```text
balanceOf(seuEndereco)
```

No `AstalantyFeeManager`, consulte:

```text
settledOperations(userOpHashCalculado)
```

Observação:

O `operationId` interno é calculado pelo contrato com `keccak256`, então para demonstração visual basta verificar os eventos emitidos no Remix e o saldo AUSD da treasury.

---

# Ordem Final

```text
MockUSDC
↓
AUSDToken
↓
AstalantyFeeManager
↓
AstalantyPaymaster
↓
AstalantySmartAccountFactory
↓
Factory.createAccount(...)
↓
AUSDToken.setMinter(FeeManager, true)
↓
FeeManager.setAuthorizedPaymaster(Paymaster)
↓
MockUSDC.mint(...)
↓
MockUSDC.approve(Paymaster, ...)
↓
Paymaster.sponsorDemoOperation(...)
```
