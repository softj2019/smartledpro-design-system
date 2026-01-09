// ================================================================
// Help Manual - 현업담당자용 운영 메뉴얼
// ================================================================

import { useState } from 'react';
import { HelpCircle, X, Home, FileText, Calendar, Monitor, Settings, ChevronRight } from 'lucide-react';
import { Button } from "@softj/smartledpro-design-system";
import { Card, CardHeader, CardTitle, CardContent } from "@softj/smartledpro-design-system";
import { Badge } from "@softj/smartledpro-design-system";

interface ManualSection {
  id: string;
  title: string;
  icon: any;
  content: React.ReactNode;
}

const manualSections: ManualSection[] = [
  {
    id: 'overview',
    title: '시스템 개요',
    icon: Home,
    content: (
      <div className="space-y-4">
        <h3 className="text-xl font-bold">고양 스마트시티 전광판 관리 시스템</h3>
        <p className="text-gray-700">
          이 시스템은 체육공원 전광판에 콘텐츠를 송출하고 관리하기 위한 통합 관리 플랫폼입니다.
        </p>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2">주요 기능</h4>
          <ul className="list-disc list-inside space-y-1 text-blue-800">
            <li>실시간 콘텐츠 송출 및 관리</li>
            <li>템플릿 기반 메시지 생성</li>
            <li>스케줄 자동화 (일회성, 매일, 매주 반복)</li>
            <li>순차 반복 송출 (Rotation)</li>
            <li>공기질 정보 자동 크롤링 및 표시</li>
            <li>경기 일정 자동 크롤링</li>
            <li>실시간 모니터링 및 Audit Log</li>
          </ul>
        </div>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-semibold text-yellow-900 mb-2">⚡ 빠른 시작</h4>
          <ol className="list-decimal list-inside space-y-2 text-yellow-800">
            <li><strong>로그인:</strong> 관리자 계정으로 로그인</li>
            <li><strong>템플릿 생성:</strong> 템플릿 관리 → 새 템플릿 생성</li>
            <li><strong>송출:</strong> 일정 관리에서 스케줄 등록 또는 스튜디오에서 순차 반복 생성</li>
            <li><strong>모니터링:</strong> 스튜디오에서 실시간 확인</li>
          </ol>
        </div>
      </div>
    ),
  },
  {
    id: 'templates',
    title: '템플릿 생성',
    icon: FileText,
    content: (
      <div className="space-y-4">
        <h3 className="text-xl font-bold">템플릿 생성 및 관리</h3>
        <p className="text-gray-700">
          템플릿은 전광판에 표시할 콘텐츠의 기본 단위입니다.
        </p>
        
        <div className="space-y-3">
          <h4 className="font-semibold text-lg">1️⃣ 템플릿 생성</h4>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li><strong>좌측 메뉴 → 템플릿 관리</strong> 클릭</li>
            <li><strong>"+새 템플릿"</strong> 버튼 클릭</li>
            <li>템플릿 정보 입력:
              <ul className="list-disc list-inside ml-6 mt-1 space-y-1">
                <li><strong>템플릿 이름:</strong> 관리용 이름 (필수)</li>
                <li><strong>제목:</strong> 전광판 상단 제목 (선택)</li>
                <li><strong>내용:</strong> 본문 텍스트 (필수)</li>
                <li><strong>강조:</strong> 하단 강조 텍스트 (선택)</li>
                <li><strong>카테고리:</strong> notice, emergency, weather 등</li>
              </ul>
            </li>
            <li>스타일 설정:
              <ul className="list-disc list-inside ml-6 mt-1 space-y-1">
                <li>배경색, 텍스트 색상</li>
                <li>글꼴 크기, 정렬</li>
              </ul>
            </li>
            <li><strong>"저장"</strong> 버튼 클릭</li>
          </ol>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <h5 className="font-semibold text-green-900 mb-1">💡 TIP</h5>
            <p className="text-green-800 text-sm">
              템플릿은 재사용 가능합니다. 자주 사용하는 형식은 템플릿으로 저장해두세요!
            </p>
          </div>
        </div>
        
        <div className="space-y-3">
          <h4 className="font-semibold text-lg">2️⃣ 템플릿 수정/삭제</h4>
          <ul className="list-disc list-inside space-y-1 text-gray-700">
            <li>템플릿 목록에서 <strong>"수정"</strong> 버튼 클릭</li>
            <li>내용 수정 후 <strong>"저장"</strong></li>
            <li>삭제는 <strong>"삭제"</strong> 버튼 클릭 (확인 필요)</li>
          </ul>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <h5 className="font-semibold text-red-900 mb-1">⚠️ 주의</h5>
            <p className="text-red-800 text-sm">
              현재 송출 중이거나 스케줄에 등록된 템플릿은 삭제하지 마세요!
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'studio',
    title: '스튜디오 운영',
    icon: Monitor,
    content: (
      <div className="space-y-4">
        <h3 className="text-xl font-bold">스튜디오: 순차 반복 송출 및 전광판 확인</h3>
        <p className="text-gray-700">
          스튜디오는 순차 반복 송출을 관리하고 전광판을 실시간으로 확인하는 중앙 관제실입니다.
        </p>
        
        <div className="space-y-3">
          <h4 className="font-semibold text-lg">1️⃣ 현재 송출 상태 확인</h4>
          <ul className="list-disc list-inside space-y-1 text-gray-700">
            <li><strong>현재 송출 중:</strong> 상단 카드에서 현재 송출 중인 콘텐츠 확인</li>
            <li><strong>송출 소스:</strong> Schedule(스케줄), Rotation(순차반복), STANDBY(대기)</li>
            <li><strong>우선순위:</strong> 높을수록 먼저 표시</li>
            <li><strong>마지막 업데이트:</strong> 실시간 갱신</li>
          </ul>
        </div>
        
        <div className="space-y-3">
          <h4 className="font-semibold text-lg">2️⃣ 순차 반복 송출 생성</h4>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li><strong>"🔄 순차 반복 송출"</strong> 섹션으로 이동</li>
            <li><strong>이름</strong> 입력 (예: "기본 공지 순환")</li>
            <li><strong>템플릿 선택:</strong> 좌측 목록에서 [+] 버튼으로 템플릿 추가</li>
            <li><strong>순서 조정:</strong> ↑↓ 버튼으로 순서 변경, ✕로 제거</li>
            <li><strong>표시 시간:</strong> 각 템플릿당 표시 시간 설정 (5초~5분)</li>
            <li><strong>기간 설정:</strong> 시작/종료 날짜 선택</li>
            <li><strong>"순차 반복 시작"</strong> 버튼 클릭</li>
          </ol>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <h5 className="font-semibold text-blue-900 mb-1">💡 TIP</h5>
            <p className="text-blue-800 text-sm">
              순차 반복은 다른 스케줄이 없을 때 <strong>기본 화면</strong>으로 사용됩니다.
              <br />
              우선순위는 자동으로 50으로 설정됩니다.
            </p>
          </div>
        </div>
        
        <div className="space-y-3">
          <h4 className="font-semibold text-lg">3️⃣ 전광판 미리보기</h4>
          <ul className="list-disc list-inside space-y-1 text-gray-700">
            <li><strong>"📺 전광판 보기"</strong> 버튼 클릭</li>
            <li>전체 화면으로 현재 송출 중인 콘텐츠 확인</li>
            <li>우측 상단 빨간 [✕] 버튼 또는 ESC 키로 닫기</li>
            <li>실시간 자동 갱신</li>
          </ul>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <h5 className="font-semibold text-green-900 mb-1">💡 TIP</h5>
            <p className="text-green-800 text-sm">
              전광판 미리보기로 송출 전 내용을 확인하세요!
            </p>
          </div>
        </div>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <h5 className="font-semibold text-yellow-900 mb-1">⚠️ 참고</h5>
          <p className="text-yellow-800 text-sm">
            순차 반복은 우선순위가 높은 스케줄이 실행되면 일시 중단되고,
            <br />
            스케줄 종료 후 자동으로 재개됩니다.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 'schedules',
    title: '스케줄 관리',
    icon: Calendar,
    content: (
      <div className="space-y-4">
        <h3 className="text-xl font-bold">스케줄: 자동화된 콘텐츠 송출</h3>
        <p className="text-gray-700">
          스케줄을 사용하면 특정 시간에 자동으로 템플릿을 송출할 수 있습니다.
        </p>
        
        <div className="space-y-3">
          <h4 className="font-semibold text-lg">1️⃣ 스케줄 생성</h4>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li><strong>일정 관리 메뉴</strong> 클릭</li>
            <li>기본 설정:
              <ul className="list-disc list-inside ml-6 mt-1 space-y-1">
                <li><strong>스케줄 이름:</strong> 관리용 이름</li>
                <li><strong>템플릿 선택:</strong> 송출할 템플릿</li>
                <li><strong>카테고리:</strong> NOTICE, EMERGENCY, WEATHER 등</li>
                <li><strong>우선순위:</strong> 긴급999, 공지100~900, 공기질70, 날씨60</li>
              </ul>
            </li>
            <li>시간 설정:
              <ul className="list-disc list-inside ml-6 mt-1 space-y-1">
                <li><strong>시작 날짜/시간:</strong> 스케줄 시작 시점</li>
                <li><strong>시작 시각:</strong> 매일 반복 시 송출 시작 시각</li>
                <li><strong>종료 시각:</strong> 매일 반복 시 송출 종료 시각</li>
              </ul>
            </li>
            <li>반복 설정:
              <ul className="list-disc list-inside ml-6 mt-1 space-y-1">
                <li><strong>반복 없음:</strong> 지정한 날짜/시간에 1회만 송출</li>
                <li><strong>매일:</strong> 매일 시작~종료 시각에 송출</li>
                <li><strong>매주:</strong> 특정 요일에만 시작~종료 시각에 송출</li>
              </ul>
            </li>
            <li><strong>"등록하기"</strong> 버튼 클릭</li>
          </ol>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <h5 className="font-semibold text-green-900 mb-1">💡 TIP</h5>
            <p className="text-green-800 text-sm">
              <strong>매일 반복</strong>: 아침 인사, 저녁 인사 등 정기 공지에 활용
              <br />
              <strong>매주 반복</strong>: 주간 공지, 요일별 이벤트 등에 활용
            </p>
          </div>
        </div>
        
        <div className="space-y-3">
          <h4 className="font-semibold text-lg">2️⃣ 스케줄 관리</h4>
          <ul className="list-disc list-inside space-y-1 text-gray-700">
            <li><strong>일시정지/재개:</strong> ⏸️ 버튼으로 일시정지, ▶️ 버튼으로 재개</li>
            <li><strong>중지:</strong> ⏹️ 버튼으로 즉시 중단 (다음 실행 시간에 자동 재개)</li>
            <li><strong>삭제:</strong> 🗑️ 버튼으로 완전 제거</li>
            <li><strong>실행 이력:</strong> Audit Log에서 확인</li>
          </ul>
        </div>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <h5 className="font-semibold text-yellow-900 mb-1">⚠️ 주의사항</h5>
          <ul className="list-disc list-inside text-yellow-800 text-sm space-y-1">
            <li>여러 스케줄이 동시에 실행되면 <strong>우선순위가 높은 것</strong>이 표시됩니다</li>
            <li>스케줄 시간이 종료되면 다음 우선순위 스케줄로 자동 전환됩니다</li>
            <li>긴급 공지는 우선순위 999로 설정하세요</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: 'settings',
    title: '설정 및 자동화',
    icon: Settings,
    content: (
      <div className="space-y-4">
        <h3 className="text-xl font-bold">설정 및 자동화 기능</h3>
        <p className="text-gray-700">
          시스템 설정 및 자동화 기능을 관리합니다.
        </p>
        
        <div className="space-y-3">
          <h4 className="font-semibold text-lg">1️⃣ 공기질 템플릿 자동 크롤링</h4>
          <ul className="list-disc list-inside space-y-1 text-gray-700">
            <li><strong>위치:</strong> 템플릿 관리 (자동 생성됨)</li>
            <li><strong>공기질 템플릿:</strong> 한국환경공단 API에서 실시간 데이터 크롤링</li>
            <li><strong>업데이트 주기:</strong> 매 시간 자동 실행</li>
          </ul>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <h5 className="font-semibold text-blue-900 mb-1">💡 TIP</h5>
            <p className="text-blue-800 text-sm">
              크롤링된 템플릿을 <strong>순차 반복에 등록</strong>하여 자동 송출하세요.
              <br />
              예: 공기질 정보를 10초마다 표시
            </p>
          </div>
        </div>
        
        <div className="space-y-3">
          <h4 className="font-semibold text-lg">2️⃣ 경기 일정 자동 크롤링</h4>
          <ul className="list-disc list-inside space-y-1 text-gray-700">
            <li><strong>위치:</strong> 중산경기장 메뉴</li>
            <li><strong>템플릿:</strong> 고양시 체육시설 대관 시스템에서 오늘 경기 크롤링</li>
            <li><strong>스케줄 자동 생성:</strong> 경기 일정이 있으면 자동으로 스케줄 등록</li>
            <li><strong>업데이트:</strong> 매일 오전 6시 크롤링</li>
          </ul>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <h5 className="font-semibold text-yellow-900 mb-1">⚠️ 참고</h5>
            <p className="text-yellow-800 text-sm">
              크롤러가 템플릿 및 스케줄을 자동 생성하므로 별도 설정이 필요 없습니다.
              <br />
              중산경기장 메뉴에서 수동으로 크롤링을 실행할 수도 있습니다.
            </p>
          </div>
        </div>
        
        <div className="space-y-3">
          <h4 className="font-semibold text-lg">3️⃣ 디버그 패널</h4>
          <ul className="list-disc list-inside space-y-1 text-gray-700">
            <li><strong>위치:</strong> 좌측 메뉴 → 디버그 패널 (ADMIN 전용)</li>
            <li><strong>기능:</strong>
              <ul className="list-disc list-inside ml-6 mt-1 space-y-1">
                <li>실시간 송출 상태 확인</li>
                <li>활성 스케줄/순차반복 목록</li>
                <li>Display 강제 초기화</li>
                <li>경기 일정 스케줄 삭제</li>
              </ul>
            </li>
          </ul>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <h5 className="font-semibold text-red-900 mb-1">⚠️ 주의</h5>
            <p className="text-red-800 text-sm">
              디버그 패널은 <strong>긴급 상황 또는 테스트 용도</strong>로만 사용하세요.
              <br />
              정상 운영 중에는 스튜디오를 사용하세요.
            </p>
          </div>
        </div>
      </div>
    ),
  },
];

export function HelpManual() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState<string>('overview');

  const currentSection = manualSections.find(s => s.id === selectedSection);

  return (
    <>
      {/* Floating Help Button */}
      <div className="fixed top-20 right-6 z-40">
        <Button
          onClick={() => setIsOpen(!isOpen)}
          size="lg"
          className="rounded-full w-14 h-14 shadow-lg hover:shadow-xl transition-all"
          variant={isOpen ? "default" : "outline"}
        >
          {isOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <HelpCircle className="w-6 h-6" />
          )}
        </Button>
      </div>

      {/* Manual Drawer */}
      {isOpen && (
        <div 
          className="fixed top-0 right-0 h-screen w-[600px] bg-white shadow-2xl z-30 flex flex-col border-l border-gray-200"
          style={{ marginTop: '0px' }}
        >
          {/* Header */}
          <div className="border-b border-gray-200 p-6 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-2xl font-bold text-gray-900">📚 운영 메뉴얼</h2>
              <Badge variant="outline" className="bg-white">v2.0</Badge>
            </div>
            <p className="text-sm text-gray-600">
              전광판 관리 시스템 현업담당자용 가이드
            </p>
          </div>

          {/* Content */}
          <div className="flex flex-1 overflow-hidden">
            {/* Sidebar */}
            <div className="w-48 border-r border-gray-200 bg-gray-50 overflow-y-auto">
              <nav className="p-3 space-y-1">
                {manualSections.map((section) => {
                  const Icon = section.icon;
                  const isActive = selectedSection === section.id;
                  
                  return (
                    <button
                      key={section.id}
                      onClick={() => setSelectedSection(section.id)}
                      className={`
                        w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors
                        ${isActive 
                          ? 'bg-blue-600 text-white shadow-sm' 
                          : 'text-gray-700 hover:bg-gray-200'
                        }
                      `}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="flex-1 text-left truncate">{section.title}</span>
                      {isActive && <ChevronRight className="w-4 h-4 flex-shrink-0" />}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {currentSection && (
                <div className="prose prose-sm max-w-none">
                  {currentSection.content}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 p-4 bg-gray-50">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <div>
                문의: 고양시 스마트시티 담당부서
              </div>
              <div>
                Last Updated: 2024-12-24
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
