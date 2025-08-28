import fs from 'fs/promises';
import path from 'path';

interface MovieSchedule {
  branch: string;
  theater: string;
  date: string;
}

interface MoviesData {
  [movieName: string]: MovieSchedule[];
}

export default async function Home() {
  let movies: MoviesData = {};
  let error: string | null = null;

  try {
    const filePath = path.join(process.cwd(), '..', 'data', 'movies.json');
    const fileContents = await fs.readFile(filePath, 'utf8');
    movies = JSON.parse(fileContents);
  } catch (e: any) {
    console.error('Failed to read or parse movies.json:', e);
    error = e.message;
  }

  // 영화 목록을 버튼 개수가 적은 순서대로 정렬
  const sortedMovieEntries = Object.entries(movies).sort(([, schedulesA], [, schedulesB]) => {
    return schedulesA.length - schedulesB.length;
  });

  return (
    <main className="flex min-h-screen flex-col items-center p-8 bg-gray-100">
      <h1 className="text-5xl font-extrabold mb-12 text-gray-900">제주 영화 상영 시간표</h1>
      {error && <p className="text-red-600 text-lg">Error: {error}</p>}
      {!error && Object.keys(movies).length === 0 && <p className="text-gray-700 text-lg">영화 데이터가 없습니다.</p>}
      {!error && Object.keys(movies).length > 0 && (
        <div className="w-full max-w-5xl">
          {sortedMovieEntries.map(([movieName, schedules]) => {
            // 날짜, 극장, 지점 순으로 스케줄 정렬
            const sortedSchedules = [...schedules].sort((a, b) => {
              if (a.date !== b.date) {
                return a.date.localeCompare(b.date);
              }
              if (a.theater !== b.theater) {
                return a.theater.localeCompare(b.theater);
              }
              return a.branch.localeCompare(b.branch);
            });

            return (
              <div key={movieName} className="mb-10 p-8 bg-white rounded-xl shadow-lg border border-gray-200">
                <h2 className="text-3xl font-bold mb-6 text-gray-800 border-b-2 border-blue-500 pb-2">🎬 {movieName}</h2>
                <div className="flex flex-wrap gap-3">
                  {sortedSchedules.map((schedule, index) => {
                    let buttonClasses = 'bg-white text-gray-800 border-gray-300'; // 기본 스타일

                    if (schedule.theater === '메가박스') {
                      buttonClasses = 'bg-white text-gray-800 border-purple-500';
                    } else if (schedule.theater === 'CGV') {
                      buttonClasses = 'bg-white text-gray-800 border-red-500';
                    } else if (schedule.theater === '롯데시네마') {
                      buttonClasses = 'bg-red-500 text-white border-red-500'; // 롯데시네마는 배경 빨간색, 텍스트 흰색
                    }

                    return (
                      <button
                        key={index}
                        className={`px-4 py-2 text-sm font-medium rounded-full border-2 ${buttonClasses} hover:opacity-80 transition-opacity duration-200 whitespace-nowrap`}
                      >
                        {`${schedule.date} ${schedule.theater} ${schedule.branch}`}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
