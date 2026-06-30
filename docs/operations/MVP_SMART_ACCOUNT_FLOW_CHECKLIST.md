# MVP Smart Account Flow Checklist

## Objetivo

Validar manualmente que `AstalantySmartAccount` e `AstalantySmartAccountFactory` estão integradas ao fluxo econômico do MVP.

---

# Deploy Atualizado

Ordem recomendada:

1. `MockUSDC`
2. `AUSDToken`
3. `AstalantyFeeManager`
4. `AstalantyPaymaster`
5. `AstalantySmartAccountFactory`
6. `AstalantySmartAccount` criada pela Factory

---

# Parâmetros

## AstalantySmartAccountFactory

Constructor:

```text
initialOwner = carteira do deployer
entryPoint_  = endereço usado como EntryPoint no MVP
```

Para demonstração visual no Remix, o `entryPoint_` pode ser a carteira do deployer. Para fluxo ERC-4337 real, deverá ser o contrato EntryPoint.

---

# Fluxo Manual

## 1. Criar Smart Account

No contrato `AstalantySmartAccountFactory`, chamar:

```text
createAccount(owner, recoveryGuardian)
```

Valores:

```text
owner = carteira do usuário
recoveryGuardian = carteira de recuperação ou address(0)
```

Resultado esperado:

- evento `SmartAccountCreated`;
- `accountOfOwner(owner)` retorna a conta criada;
- `isAstalantyAccount(account)` retorna `true`.

## 2. Executar chamada direta para demo

No contrato `AstalantySmartAccount`, chamar como owner:

```text
execute(target, value, data)
```

Para teste simples:

```text
target = endereço de um contrato ERC-20
value = 0
data = calldata ABI-encoded de uma função simples
```

Resultado esperado:

- chamada executada;
- evento `SmartAccountExecuted`.

## 3. Demonstrar ligação com Paymaster

No contrato `AstalantyPaymaster`, chamar:

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

Para MVP:

```text
account = endereço da Smart Account
payer = mesmo endereço da Smart Account
```

Observação:

Como o Paymaster exige `payer == account`, a Smart Account precisa possuir Mock USDC e aprovar o Paymaster antes desse fluxo. A aprovação pode ser feita pela Smart Account executando `MockUSDC.approve(paymaster, amount)` via `execute`.

---

# Validações

- [ ] Factory cria uma conta por owner.
- [ ] Factory bloqueia duplicidade de owner.
- [ ] Smart Account bloqueia reinitialization.
- [ ] Smart Account executa chamadas somente por owner ou EntryPoint.
- [ ] Smart Account emite evento de execução.
- [ ] Paymaster aceita a Smart Account como `account`.
- [ ] Paymaster cobra apenas quando `payer == account`.
- [ ] Fee Manager liquida AUSD após chamada do Paymaster.

---

# Limitação Consciente

O fluxo ERC-4337 completo com bundler e EntryPoint real será validado na etapa de testes/SDK.

Nesta etapa, o objetivo é demonstrar a conta inteligente criada por factory e sua compatibilidade com o núcleo econômico já implementado.
