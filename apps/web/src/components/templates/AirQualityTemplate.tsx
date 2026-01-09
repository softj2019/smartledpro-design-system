// ================================================================
// Air Quality Template - 공기질 전광판 표시 (핵심 3종)
// ================================================================

interface AirQualityData {
  pm25Value: string;
  pm25Grade: string;
  pm10Value: string;
  pm10Grade: string;
  khaiValue: string;
  khaiGrade: string;
}

interface AirQualityTemplateProps {
  data: AirQualityData;
}

// 등급별 색상 매핑
const getGradeColor = (grade: string): string => {
  switch (grade) {
    case '1': return '#3B82F6'; // 좋음 - 파랑
    case '2': return '#10B981'; // 보통 - 녹색
    case '3': return '#F59E0B'; // 나쁨 - 금색
    case '4': return '#EF4444'; // 매우나쁨 - 붉은색
    default: return '#9CA3AF'; // 알 수 없음 - 회색
  }
};

// 등급별 텍스트
const getGradeText = (grade: string): string => {
  switch (grade) {
    case '1': return '좋음';
    case '2': return '보통';
    case '3': return '나쁨';
    case '4': return '매우나쁨';
    default: return '-';
  }
};

export function AirQualityTemplate({ data }: AirQualityTemplateProps) {
  const pm25Color = getGradeColor(data.pm25Grade);
  const pm10Color = getGradeColor(data.pm10Grade);
  const khaiColor = getGradeColor(data.khaiGrade);

  const pm25Text = getGradeText(data.pm25Grade);
  const pm10Text = getGradeText(data.pm10Grade);
  const khaiText = getGradeText(data.khaiGrade);

  return (
    <div style={{ 
      width: '430px', 
      height: '260px', 
      backgroundColor: 'black', 
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '20px',
      gap: '15px',
      boxSizing: 'border-box'
    }}>
      {/* 1줄: 제목 */}
      <div style={{
        fontSize: '32px',
        lineHeight: '32px',
        color: '#F59E0B', // 금색
        textAlign: 'center'
      }}>
        고양시 공기질 현황
      </div>

      {/* 2줄: 초미세먼지 | 미세먼지 */}
      <div style={{
        fontSize: '28px',
        lineHeight: '28px',
        display: 'flex',
        alignItems: 'center',
        gap: '15px'
      }}>
        <span style={{ color: pm25Color }}>
          초미세 {data.pm25Value} {pm25Text}
        </span>
        <span style={{ color: '#F59E0B' }}>|</span>
        <span style={{ color: pm10Color }}>
          미세 {data.pm10Value} {pm10Text}
        </span>
      </div>

      {/* 3줄: 통합대기질 */}
      <div style={{
        fontSize: '32px',
        lineHeight: '32px',
        color: khaiColor,
        textAlign: 'center'
      }}>
        통합대기질 {data.khaiValue} {khaiText}
      </div>
    </div>
  );
}