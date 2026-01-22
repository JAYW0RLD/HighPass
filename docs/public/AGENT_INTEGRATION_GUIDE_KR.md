# 🤖 AI 에이전트 연동 가이드 (x402 Protocol)

이 가이드는 AI 에이전트가 HighStation 게이트웨이를 통해 유료 API를 호출하는 방법을 설명합니다. 모든 연동은 공식 **x402 프로토콜**을 따릅니다.

---

## 1. 연동 흐름 (Flow)

HighStation은 모든 요청에 대해 실시간 정산을 요구합니다.

1.  **에이전트**: `/gatekeeper/:slug/info` 호출하여 **OpenSeal 무결성 검증**.
2.  **에이전트**: 검증 통과 시 Gated API 엔드포인트 호출.
3.  **HighStation**: `402 Payment Required` 반환 및 요구 사항 전달.
4.  **에이전트**: `@crypto.com/facilitator-client`를 사용하여 결제 헤더 생성.
5.  **에이전트**: 생성된 결제 헤더를 포함하여 다시 호출.
6.  **HighStation**: 결제 검증 및 정산 완료 후 API 응답 전달.

---

## 2. 필수 라이브러리 설치

```bash
npm install @crypto.com/facilitator-client viem
```

---

## 3. 코드 예시 (TypeScript)

에이전트는 다음과 같이 `Facilitator` SDK를 사용하여 결제를 수행할 수 있습니다.

```typescript
import { Facilitator } from '@crypto.com/facilitator-client';
import { CronosNetwork } from '@crypto.com/facilitator-client/dist/integrations/facilitator.interface';
import { ethers } from 'ethers';
import axios from 'axios';

async function callGatedApi() {
    // 1. 초기 호출 시도
    const endpoint = "https://gateway.highstation.io/gatekeeper/awesome-api/resource";
    
    try {
        await axios.get(endpoint);
    } catch (error: any) {
        if (error.response?.status === 402) {
            const requirements = error.response.data.requirements;
            
            // 2. 결제 헤더 생성
            const signer = new ethers.Wallet(PRIVATE_KEY, provider);
            const facilitator = new Facilitator({ network: CronosNetwork.CronosTestnet });
            
            const paymentHeader = await facilitator.generatePaymentHeader({
                to: requirements.payTo,
                value: requirements.maxAmountRequired,
                signer: signer
            });

            // 3. 결제 헤더와 함께 재호출
            const result = await axios.get(endpoint, {
                headers: {
                    'Authorization': `Bearer ${paymentHeader}`
                }
            });
            
            console.log("성공:", result.data);
        }
    }
}
```

---

## 4. MCP를 통한 자동 발굴 (Discovery)

AI Agent는 **MCP(Model Context Protocol)** 표준을 통해 HighStation에 등록된 API를 스스로 찾아낼 수 있습니다.

### 🔌 연결 (Connection) & 발견 (Bootstrapping)

현재 MCP 생태계에는 글로벌 자동 발견 레지스트리가 없으므로, **최초 연결은 수동 구성(Config)**이 필요합니다.

1. **게이트웨이 주소 설정**: Agent에게 아래 엔드포인트를 알려주어야 합니다 (설정 파일, 환경 변수 등).
   - **MCP Endpoint**: `https://gateway.highstation.io/mcp/sse`
   
2. **연결 수립 (Handshake)**:
   - Agent는 위 주소로 `SSE(Server-Sent Events)` 연결을 요청합니다.
   - 연결이 성공하면 HighStation은 MCP 프로토콜에 따라 사용 가능한 도구 목록(`search_services`, `get_payment_info`)을 Agent에게 전송합니다.
   
이후 Agent는 이 도구들을 사용하여 필요한 API를 **스스로 탐색(Discovery)** 할 수 있게 됩니다. 즉, "게이트웨이 주소"만 알면 나머지 API는 몰라도 됩니다.

### 🛠️ 제공 도구 (Tools)

1.  **`search_services`**: API 검색
    - **입력**: `query` (필수, 예: "stock", "news"), `category` (선택)
    - **설명**: HighStation DB의 `search_vector`를 검색하여 연관된 유료 API 목록(이름, 가격, 설명)을 반환합니다.
    - **Agent 행동**: 사용자의 자연어 요청(예: "주식 정보가 필요해")을 받으면 이 도구를 호출하여 적절한 API를 찾습니다.

2.  **`get_payment_info`**: 결제 프로토콜 확인
    - **입력**: 없음
    - **설명**: 현재 네트워크(Cronos Testnet)와 Facilitator 주소, 결제 방식(x402) 정보를 JSON으로 반환합니다.
    - **Agent 행동**: 검색된 API가 유료인 경우, 이 도구를 호출하여 결제 헤더 생성에 필요한 체인 정보를 얻습니다.

---

## 5. 검증 플래그 해석 (Verification Flags)

모든 서비스는 `/info` 엔드포인트를 통해 `trust_signal`을 제공합니다. 에이전트는 이를 기반으로 구매 여부를 결정해야 합니다.

```json
"trust_signal": {
  "computed_score": 0.98,
  "optimized_metadata": {
    "openseal_verified": true,  // [중요] 코드가 위변조되지 않았음 (L1)
    "zk_proof_valid": true,     // [중요] 성능 지표가 수학적으로 증명됨 (L2)
    "reliability_rank": "A"     // 통계적 신뢰도 (L3)
  }
}
```

> **권장 전략**: `openseal_verified: true`인 서비스만 이용하도록 설정하여 보안 위험을 원천 차단하십시오.
