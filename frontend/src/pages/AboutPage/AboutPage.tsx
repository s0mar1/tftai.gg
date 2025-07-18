import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

type Section = 'intro' | 'developer' | 'roadmap' | 'updates' | 'privacy' | 'terms';

const AboutPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState<Section>('intro');
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const section = params.get('section') as Section;
    if (section) {
      setActiveSection(section);
    }
  }, [location.search]);

  const renderSection = () => {
    switch (activeSection) {
      case 'intro':
        return (
          <div className="space-y-4">
            <h2 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary">TFTai.gg 소개</h2>
            <p className="text-text-secondary dark:text-dark-text-secondary leading-relaxed">
              TFTai.gg는 AI 기반의 최첨단 전략적 팀 전투(TFT) 메타 분석 도구입니다.
              최신 인공지능 기술을 활용하여 플레이어들에게 가장 정확하고 시의적절한 게임 전략과 통찰력을 제공합니다.
            </p>
            <p className="text-text-secondary dark:text-dark-text-secondary leading-relaxed">
              저희의 목표는 모든 플레이어가 자신의 실력을 향상시키고,
              TFT에서 최고의 경험을 할 수 있도록 돕는 것입니다.
              AI가 분석한 데이터를 통해 덱 빌딩, 아이템 선택, 배치 전략 등
              다양한 측면에서 최적의 가이드를 받아보세요.
            </p>
          </div>
        );
      case 'developer':
        return (
          <div className="space-y-4">
            <h2 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary">개발자 정보</h2>
            <p className="text-text-secondary dark:text-dark-text-secondary leading-relaxed">
              안녕하세요, TFTai.gg의 개발자이자 '쇼린고'라는 닉네임으로 활동하는 플레이어입니다. 저는 여러 시즌 동안 챌린저 티어를 유지��왔습니다.
              <br /><br />
              저 또한 게임을 하며 많은 통계 사이트를 이용했지만, 방대한 데이터 속에서 정말 의미 있는 지표를 가려내 게임에 적용하기란 여전히 어려웠습니다. 이런 고민을 해결하고 AI로 데이터를 분석하여 실질적인 도움을 드리는 서비스를 만들고 싶어 TFTai.gg를 개발했습니다.
            </p>
            <div>
              <p className="text-text-secondary dark:text-dark-text-secondary leading-relaxed">
                <strong>TFT 챌린저 달성 이력:</strong>
              </p>
              <ul className="list-disc list-inside ml-4 mt-2 text-text-secondary dark:text-dark-text-secondary">
                <li>8.5 시즌부터 현재 14시즌에 이르기까지, 11시즌을 제외한 모든 시즌 챌린저 달성</li>
                <li>시즌 12: 1400점 (랭킹 9위)</li>
              </ul>
              <img src="/assets/about/set12.png" alt="시즌 12 랭킹 9위 달성" className="mt-4 rounded-lg shadow-md max-w-full h-auto" />
            </div>
            <p className="text-text-secondary dark:text-dark-text-secondary leading-relaxed">
              저는 단순히 게임을 즐기는 것을 넘어, 다양한 티어의 플레이어들을 코칭하며 어떤 조언이 실력 향상으로 이어지는지 꾸준히 연구해왔습니다. 이러한 저의 경험과 데이터를 AI에게 학습시켜, 사용자에게 가장 효과적인 분석과 피드백을 제공하도록 설계했습니다.
              <br /><br />
              저의 경험을 학습한 TFTai.gg의 AI는 단순한 통계 분석을 넘어, 게임의 미묘한 흐름과 전략적 판단까지 이해하여 여러분께 살아있는 메타 분석과 최적화된 지표를 제공합니다.
            </p>
            <p className="text-text-secondary dark:text-dark-text-secondary leading-relaxed">
              문의사항이나 피드백은 언제든지 환영합니다.
              <br />
              이메일: your.email@example.com
              <br />
              (추가 소셜 미디어 링크 등)
            </p>
          </div>
        );
      case 'roadmap':
        return (
          <div className="space-y-4">
            <h2 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary">후원 안내 및 로드맵</h2>
            <p className="text-text-secondary dark:text-dark-text-secondary leading-relaxed">
              TFTai.gg는 단순히 현재 메타를 분석하는 것을 넘어,
              미래의 TFT 전략을 예측하고 플레이어 커뮤니티와 함께 성장하는 것을 목표로 합니다.
            </p>
            <h3 className="text-2xl font-semibold text-text-primary dark:text-dark-text-primary mt-6">단기 로드맵</h3>
            <ul className="list-disc list-inside text-text-secondary dark:text-dark-text-secondary space-y-2">
              <li>사용자 맞춤형 전략 추천 시스템 고도화</li>
              <li>실시간 게임 데이터 연동 및 분석 속도 개선</li>
              <li>모바일 앱 개발 (iOS/Android)</li>
            </ul>
            <h3 className="text-2xl font-semibold text-text-primary dark:text-dark-text-primary mt-6">장기 로드맵</h3>
            <ul className="list-disc list-inside text-text-secondary dark:text-dark-text-secondary space-y-2">
              <li>AI 기반 개인 코칭 시스템 도입</li>
              <li>커뮤니티 기능 강화 (전략 공유, 토론 등)</li>
              <li>다국어 지원 확장</li>
            </ul>
            <h3 className="text-2xl font-semibold text-text-primary dark:text-dark-text-primary mt-6">후원 안내</h3>
            <p className="text-text-secondary dark:text-dark-text-secondary leading-relaxed">
              TFTai.gg는 여러분의 후원으로 운영되고 발전합니다.
              더 나은 서비스를 제공하고 새로운 기능을 개발하는 데 큰 힘이 됩니다.
              <br />
              후원 링크: [여기에 펀딩 링크 삽입]
              <br />
              (후원 시 얻는 혜택 등 추가 설명)
            </p>
          </div>
        );
      case 'updates':
        return (
          <div className="space-y-4">
            <h2 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary">업데이트 내역 및 개발자 코멘트</h2>
            <p className="text-text-secondary dark:text-dark-text-secondary leading-relaxed">
              TFTai.gg는 TFT 패치 주기에 맞춰 지속적으로 업데이트되며,
              AI 모델 또한 최신 메타를 반영하여 주기적으로 재훈련됩니다.
            </p>
            <div className="mt-6 space-y-6">
              <div className="bg-background-card dark:bg-dark-background-card p-4 rounded-lg shadow-sm">
                <h3 className="text-xl font-semibold text-text-primary dark:text-dark-text-primary">2025년 7월 3일 업데이트</h3>
                <p className="text-text-secondary dark:text-dark-text-secondary text-sm">개발자 코멘트: 초기 페이지 구성 및 버그 수정</p>
                <ul className="list-disc list-inside text-text-secondary dark:text-dark-text-secondary mt-2">
                  <li>"About TFTai.gg" 페이지 초기 구성 및 콘텐츠 추가</li>
                  <li>TFT 데이터 서비스 초기화 오류 수정</li>
                  <li>가이드 상세 페이지의 아이템 렌더링 오류 수정</li>
                </ul>
              </div>
              <div className="bg-background-card dark:bg-dark-background-card p-4 rounded-lg shadow-sm">
                <h3 className="text-xl font-semibold text-text-primary dark:text-dark-text-primary">2025년 6월 20일 업데이트</h3>
                <p className="text-text-secondary dark:text-dark-text-secondary text-sm">개발자 코멘트: AI 모델 성능 개선</p>
                <ul className="list-disc list-inside text-text-secondary dark:text-dark-text-secondary mt-2">
                  <li>AI 덱 분석 모델 정확도 15% 향상</li>
                  <li>새로운 챔피언 및 특성 데이터 반영</li>
                </ul>
              </div>
              {/* 추가 업데이트 내역 */}
            </div>
          </div>
        );
      case 'privacy':
        return (
          <div className="space-y-6 text-text-secondary dark:text-dark-text-secondary leading-relaxed">
            <h2 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary">개인정보 처리방침</h2>
            <p className="text-sm text-text-secondary dark:text-dark-text-secondary">시행일자: 2025년 7월 3일</p>
            
            <div>
              <h3 className="text-xl font-semibold text-text-primary dark:text-dark-text-primary mb-2">제1조 (총칙)</h3>
              <p>TFTai.gg는 이용자의 개인정보를 매�� 중요하게 생각하며, 「개인정보 보호법」 등 관련 법령을 준수하고 있습니다. 본 개인정보처리방침은 TFTai.gg가 제공하는 서비스(이하 "서비스")에 적용되며, 이용자가 제공하는 개인정보가 어떠한 용도와 방식으로 이용되고 있으며, 개인정보보호를 위해 어떠한 조치가 취해지고 있는지 알려드립니다. 본 개인정보처리방침은 법령 및 정부지침의 변경과 보다 나은 서비스 제공을 위하여 그 내용이 변경될 수 있으며, 변경 시에는 웹사이트 공지사항을 통하여 공지할 것입니다.</p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-text-primary dark:text-dark-text-primary mb-2">제2조 (개인정보의 수집 항목 및 이용 목적)</h3>
              <p>TFTai.gg는 서비스 제공을 위해 필요한 최소한의 범위 내에서 다음과 같이 개인정보를 수집하고 이용합니다. 이용자는 개인정보 수집에 동의하지 않을 권리가 있으나, 동의를 거부할 경우 일부 서비스 이용에 제한이 있을 수 있습니다.</p>
              <div className="mt-4 p-4 border border-border-light dark:border-dark-border-light rounded-lg bg-background-card dark:bg-dark-background-card space-y-4">
                <div>
                  <h4 className="font-semibold">수집 항목</h4>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li><strong>Riot Games API를 통해 제공되는 정보:</strong> 소환사 이름, 게임 전적, 순위, 리그 정보 등</li>
                    <li><strong>서비스 이용 과정에서 자동 생성되는 정보:</strong> IP 주소, 쿠키, 서비스 이용 기록, 접속 로그, 기기 정보</li>
                    <li><strong>AI 질의응답 기록:</strong> 이용자가 입력한 질문 및 그에 대한 AI의 답변 내용</li>
                    <li><strong>이메일 주소 (향후 회원가입 기능 도입 시):</strong> 회원 식별, 공지사항 전달 등</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold">수집 및 이용 목적</h4>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>전적 검색, 통계 분석, 메타 정보 제공 등 서비스의 핵심 기능 제공</li>
                    <li>서비스 품질 개선, 부정 이용 방지, 통계 분석</li>
                    <li>AI 모델 학습 및 성능 개선 (비식별화 조치 후 사용)</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-text-primary dark:text-dark-text-primary mb-2">제3조 (개인정보의 보유 및 이용기간)</h3>
              <p>TFTai.gg는 원칙적으로 개인정보의 수집 및 이용 목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다. 단, 다음의 정보에 대해서는 아래의 사유로 명시한 기간 동안 보존합니다.</p>
              <div className="mt-4 p-4 border border-border-light dark:border-dark-border-light rounded-lg bg-background-card dark:bg-dark-background-card space-y-4">
                <div>
                  <h4 className="font-semibold">TFTai.gg 내부 방침에 의한 정보 보유 사유</h4>
                  <ul className="list-disc list-inside mt-2">
                    <li>부정 이용 기록: 부정 이용 방지를 위해 1년간 보관 후 파기</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold">관련 법령에 의한 정보 보유 사유</h4>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>계약 또는 청약철회 등에 관한 기록: 5년 (전자상거래 등에서의 소비자보호에 관한 법률)</li>
                    <li>대금결제 및 재화 등의 공급에 관한 기록: 5년 (전자상거래 등에서의 소비자보호에 관한 법률)</li>
                    <li>소비자의 불만 또는 분쟁처리에 관한 기록: 3년 (전자상거래 등에서의 소비자보호에 관한 법률)</li>
                    <li>로그인 기록 등 통신사실확인자료: 3개월 (통신비밀보호법)</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-text-primary dark:text-dark-text-primary mb-2">제4조 (개인정보의 제3자 제공 및 처리위탁)</h3>
              <p>TFTai.gg는 이용자의 개인정보를 제2조에서 명시한 범위 내에서만 처리하며, 이용자의 사전 동의 없이는 동 범위를 초과하여 이용하거나 원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다. 다만, 아래의 경우에는 예외로 합니다.</p>
              <ul className="list-disc list-inside my-2 space-y-1">
                <li>이용자들이 사전에 동의한 경우</li>
                <li>법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우</li>
              </ul>
              <p>TFTai.gg는 원활한 서비스 제공을 위해 다음과 같이 개인정보 처리업무를 외부에 위탁할 수 있습니다.</p>
              <div className="mt-4 p-4 border border-border-light dark:border-dark-border-light rounded-lg bg-background-card dark:bg-dark-background-card">
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>위탁받는 자 (수탁업체):</strong> [서비스 제공을 위한 클라우드/서버 호스팅 업체명]</li>
                  <li><strong>위탁하는 업무의 내용:</strong> 서비스 제공을 위한 서버 운영 및 데이터 보관 등</li>
                  <li><strong>보유 및 이용기간:</strong> 회원 탈퇴 시 또는 위탁 계약 종료 시까지</li>
                </ul>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-text-primary dark:text-dark-text-primary mb-2">제5조 (개인정보의 파기절차 및 방법)</h3>
              <p><strong>파기절차:</strong> 이용자가 입력한 정보는 목적 달성 후 별도의 데이터베이스(DB)로 옮겨져 내부 방침 및 기타 관련 법령에 따라 일정 기간 저장된 후 파기됩니다.</p>
              <p className="mt-2"><strong>파기방법:</strong> 전자적 파일 형태는 기록을 재생할 수 없는 기술적 방법을 사용하여 삭제하고, 종이 문서는 분쇄하거나 소각하여 파기합니다.</p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-text-primary dark:text-dark-text-primary mb-2">제6조 (정보주체와 법정대���인의 권리·의무 및 행사방법)</h3>
              <p>이용자는 언제든지 자신의 개인정보를 조회·수정·삭제·처리정지 요청 및 동의 철회를 할 수 있습니다. 이는 개인정보 보호책임자에게 서면, 전화 또는 이메일로 연락하시면 지체 없이 조치하겠습니다. (회원가입 기능 도입 시에는 웹사이트 내 기능을 통해서도 가능)</p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-text-primary dark:text-dark-text-primary mb-2">제7조 (개인정보의 안전성 확보 조치)</h3>
              <p>TFTai.gg는 개인정보가 분실, 도난, 유출, 변조 또는 훼손되지 않도록 안전성 확보를 위하여 다음과 같은 기술적·관리적·물리적 조치를 강구하고 있습니다.</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><strong>관리적 조치:</strong> 내부관리계획 수립·시행, 정기적 직원 교육 등</li>
                <li><strong>기술적 조치:</strong> 개인정보처리시스템 접근권한 관리, 접근통제시스��� 설치, 암호화, 보안프로그램 설치</li>
                <li><strong>물리적 조치:</strong> 전산실, 자료보관실 등의 접근통제</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-text-primary dark:text-dark-text-primary mb-2">제8조 (개인정보 자동 수집 장치의 설치·운영 및 거부에 관한 사항)</h3>
              <p>TFTai.gg는 이용자에게 맞춤 서비스를 제공하기 위해 '쿠키(cookie)'를 사용합니다. 이용자는 웹브라우저 옵션 설정을 통해 쿠키 허용 및 거부를 선택할 수 있으나, 거부 시 일부 서비스 이용에 어려움이 있을 수 있습니다.</p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-text-primary dark:text-dark-text-primary mb-2">제9조 (개인정보 보호책임자)</h3>
              <div className="mt-2 p-4 border border-border-light dark:border-dark-border-light rounded-lg bg-background-card dark:bg-dark-background-card">
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>이름:</strong> [이름]</li>
                  <li><strong>소속/직책:</strong> 운영자</li>
                  <li><strong>이메일:</strong> [support@tftai.gg]</li>
                </ul>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-text-primary dark:text-dark-text-primary mb-2">제10조 (권익침해 구제방법)</h3>
              <p>개인정보침해에 대한 신고나 상담이 필요하신 경우에는 개인정보분쟁조정위원회(1833-6972), 한국인터넷진흥원 개인정보침해신고센터(118) 등으로 문의하시기 바랍니다.</p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-text-primary dark:text-dark-text-primary mb-2">제11조 (개인정보처리방침의 변경에 관한 사항)</h3>
              <p>본 개인정보처리방침의 내용 추가, 삭제 및 수정이 있을 시에는 개정 최소 7일 전부터 웹사이트의 '공지사항'을 통해 고지할 것입니다.</p>
            </div>
          </div>
        );
      case 'terms':
        return (
          <div className="space-y-6 text-text-secondary dark:text-dark-text-secondary leading-relaxed">
            <h2 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary">서비스 이용약관</h2>
            
            <div>
              <h3 className="text-xl font-semibold text-text-primary dark:text-dark-text-primary mb-2">제1조 (목적)</h3>
              <p>이 약관은 TFTai.gg가 제공하는 TFTai.gg 및 관련 제반 서비스(이하 "서비스")의 이용과 관련하여 TFTai.gg와 이용자의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.</p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-text-primary dark:text-dark-text-primary mb-2">제2조 (용어의 정의)</h3>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>"서비스":</strong> TFTai.gg 웹사이트를 통해 제공하는 팀 파이트 택틱스 관련 전적 검색, 통계 분석, 덱 빌더, AI 기반 질문/답변 기능 등 모든 제반 서비스를 의미합니다.</li>
                <li><strong>"이용자":</strong> 이 약관에 따라 서비스를 이용하는 모든 사용자를 의미합니다.</li>
                <li><strong>"Riot Games API":</strong> Riot Games, Inc.가 제공하는 공식 데이터 인터페이스를 의미합니다.</li>
                <li><strong>"AI 기능":</strong> 인공지능 모델이 생성한 답변 및 정보를 제공하는 서비스를 의미합니다.</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-text-primary dark:text-dark-text-primary mb-2">제3조 (약관의 명시와 개정)</h3>
              <p>TFTai.gg는 이 약관의 내용을 이용자가 쉽게 알 수 있도록 서비스 초기 화면 또는 연결화면을 통하여 게시하며, 관련 법령에 따라 약관을 개정할 수 있습니다. 개정 시에는 적용일자 7일 전(이용자에게 불리한 경우 30일 전)에 공지합니다.</p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-text-primary dark:text-dark-text-primary mb-2">제4조 (서비스의 제공 및 변경)</h3>
              <p>TFTai.gg는 게임 전적 정보 제공, 메타 분석, AI 기능 등 다양한 서비스를 제공하며, 운영상·기술상 필요에 따라 서비스를 변경할 수 있습니다. 무료 서비스의 일부 또는 전부는 정책에 따라 수정, 중단, 변경될 수 있으며 이에 대해 별도의 보상을 하지 않습니다.</p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-text-primary dark:text-dark-text-primary mb-2">제5조 (서비스의 이용)</h3>
              <p>서비스는 연중무휴, 1일 24시간 제공함을 원칙으로 하나, 정보통신설비의 보수점검 등 운영상 이유가 있는 경우 일시 중단될 수 있습니다.</p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-text-primary dark:text-dark-text-primary mb-2">제6조 (TFTai.gg의 의무)</h3>
              <p>TFTai.gg는 관련법과 본 약관에 따라 지속적이고 안정적으로 서비스를 제공하며, 이용자의 개인정보 보호를 위해 최선을 다합니다.</p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-text-primary dark:text-dark-text-primary mb-2">제7조 (이용자의 의무 및 금지 행위)</h3>
              <p>이용자는 허위 정보를 등록하거나, 타인의 정보를 도용하는 행위, 서비스의 안정적 운영을 방해하는 행위(자동화된 수단으로 정보 수집, 악의적 AI 기능 사용 등)를 해서는 안 됩니다.</p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-text-primary dark:text-dark-text-primary mb-2">제8조 (면책 조항 및 책임 제한)</h3>
              <ul className="list-disc list-inside space-y-2">
                <li><strong>[일반 면책]</strong> TFTai.gg는 천재지변 또는 이에 준하는 불가항력으로 서비스를 제공할 수 없는 경우 책임이 면제됩니다. 서비스는 "있는 그대로(AS IS)" 제공되며, 서비스의 완전성이나 특정 목적에의 적합성을 보증하지 않습니다.</li>
                <li><strong>[Riot Games API 관련 특별 면책]</strong> 본 서비스가 제공하는 모든 게임 관련 데이터는 Riot Games API에 전적으로 의존합��다. TFTai.gg는 Riot Games API로부터 수신되는 데이터의 정확성, 완전성, 최신성에 대해 어떠한 보증도 하지 않으며, 이로 인해 발생하는 정보의 부정확성이나 서비스 지연에 대해 어떠한 책임도 지지 않습니다.</li>
                <li><strong>[AI 기능 관련 특별 면책]</strong> AI 기능이 제공하는 정보는 오직 정보 제공 및 오락 목적으로만 사용되어야 하며, 정확성이나 유용성을 보증하지 않습니다. AI가 제공한 정보를 바탕으로 내린 결정이나 행동으로 인해 발생하는 모든 결과에 대해 TFTai.gg는 어떠한 책임도 지지 않습니다.</li>
                <li>TFTai.gg는 이용자의 귀책사유로 인한 서비스 이용 장애에 대하여 책임을 지지 않습니다.</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-text-primary dark:text-dark-text-primary mb-2">제9조 (지식재산권의 귀속)</h3>
              <p>서비스에 대한 저작권 및 지식재산권은 TFTai.gg에 귀속됩니다. 이용자는 TFTai.gg로부터 서비스의 이용을 허락받는 것이��, 서비스 내 정보를 개인적인 용도 외에 상업적 목적으로 사용할 수 없습니다.</p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-text-primary dark:text-dark-text-primary mb-2">제10조 (분쟁 해결 및 준거법)</h3>
              <p>TFTai.gg와 이용자 간에 발생한 분쟁에 대하여는 대한민국법을 준거법으로 하며, 분쟁에 관한 소송은 민사소송법상의 관할법원에 제소합니다.</p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-8 p-8 bg-background-card dark:bg-dark-background-card rounded-lg shadow-lg">
      {/* 왼쪽 박스형 내비게이션 */}
      <nav className="md:w-1/5 flex-shrink-0">
        <ul className="space-y-2">
          <li>
            <button
              onClick={() => setActiveSection('intro')}
              className={`w-full text-left px-4 py-2 rounded-md transition-colors duration-200
                ${activeSection === 'intro' ? 'bg-brand-mint text-white' : 'bg-background-base dark:bg-dark-background-base hover:bg-background-card dark:hover:bg-dark-background-card text-text-primary dark:text-dark-text-primary'}`}
            >
              TFTai.gg 소개
            </button>
          </li>
          <li>
            <button
              onClick={() => setActiveSection('developer')}
              className={`w-full text-left px-4 py-2 rounded-md transition-colors duration-200
                ${activeSection === 'developer' ? 'bg-brand-mint text-white' : 'bg-background-base dark:bg-dark-background-base hover:bg-background-card dark:hover:bg-dark-background-card text-text-primary dark:text-dark-text-primary'}`}
            >
              개발자 소개
            </button>
          </li>
          <li>
            <button
              onClick={() => setActiveSection('roadmap')}
              className={`w-full text-left px-4 py-2 rounded-md transition-colors duration-200
                ${activeSection === 'roadmap' ? 'bg-brand-mint text-white' : 'bg-background-base dark:bg-dark-background-base hover:bg-background-card dark:hover:bg-dark-background-card text-text-primary dark:text-dark-text-primary'}`}
            >
              후원 및 로드맵
            </button>
          </li>
          <li>
            <button
              onClick={() => setActiveSection('updates')}
              className={`w-full text-left px-4 py-2 rounded-md transition-colors duration-200
                ${activeSection === 'updates' ? 'bg-brand-mint text-white' : 'bg-background-base dark:bg-dark-background-base hover:bg-background-card dark:hover:bg-dark-background-card text-text-primary dark:text-dark-text-primary'}`}
            >
              업데이트 내역
            </button>
          </li>
          <li>
            <button
              onClick={() => setActiveSection('privacy')}
              className={`w-full text-left px-4 py-2 rounded-md transition-colors duration-200
                ${activeSection === 'privacy' ? 'bg-brand-mint text-white' : 'bg-background-base dark:bg-dark-background-base hover:bg-background-card dark:hover:bg-dark-background-card text-text-primary dark:text-dark-text-primary'}`}
            >
              개인정보 처리방침
            </button>
          </li>
          <li>
            <button
              onClick={() => setActiveSection('terms')}
              className={`w-full text-left px-4 py-2 rounded-md transition-colors duration-200
                ${activeSection === 'terms' ? 'bg-brand-mint text-white' : 'bg-background-base dark:bg-dark-background-base hover:bg-background-card dark:hover:bg-dark-background-card text-text-primary dark:text-dark-text-primary'}`}
            >
              서비스 이용약관
            </button>
          </li>
        </ul>
      </nav>

      {/* 오른쪽 콘텐츠 영역 */}
      <div className="md:w-4/5">
        {renderSection()}
      </div>
    </div>
  );
}

export default AboutPage;
