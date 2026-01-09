// ================================================================
// Match Schedule Template - 경기 일정 전광판 표시
// ================================================================

interface Match {
  club_name: string;
  time_range: string;
  stadium: string;
}

interface MatchScheduleTemplateProps {
  matches: Match[];
}

export function MatchScheduleTemplate({ matches }: MatchScheduleTemplateProps) {
  return (
    <div style={{ 
      width: '100%', 
      height: '100%', 
      backgroundColor: 'black', 
      color: 'white', 
      fontSize: '48px',
      lineHeight: '48px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <div>오늘 대관 정보</div>
      {matches.map((match, index) => {
        const timeOnly = match.time_range.replace(/시/g, '');
        return (
          <div key={index}>
            {match.club_name} {timeOnly}
          </div>
        );
      })}
    </div>
  );
}
