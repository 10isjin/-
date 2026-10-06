import { Classroom, Student, AppStateData, FeedbackItem } from '../types';
import initialFeedbacks from './initialFeedbacks.json';

export function getDefaultClasses(): Classroom[] {
  return [
  {
    "id": "3-1",
    "name": "3학년 1반"
  },
  {
    "name": "3학년 2반",
    "id": "3-2"
  },
  {
    "id": "3-3",
    "name": "3학년 3반"
  },
  {
    "name": "3학년 4반",
    "id": "3-4"
  },
  {
    "name": "3학년 5반",
    "id": "3-5"
  },
  {
    "id": "3-6",
    "name": "3학년 6반"
  },
  {
    "id": "3-7",
    "name": "3학년 7반"
  },
  {
    "name": "3학년 8반",
    "id": "3-8"
  },
  {
    "name": "3학년 9반",
    "id": "3-9"
  },
  {
    "name": "3학년 10반",
    "id": "3-10"
  },
  {
    "name": "3학년 11반",
    "id": "3-11"
  }
];
}

export function getDefaultStudents(): Student[] {
  return [
  {
    "name": "권아준",
    "classId": "3-1",
    "id": "c3-1-1-1790572923441-e2qt",
    "number": 1
  },
  {
    "number": 2,
    "id": "c3-1-2-1790572923441-7abq",
    "name": "김민경",
    "classId": "3-1"
  },
  {
    "name": "김슬",
    "classId": "3-1",
    "id": "c3-1-3-1790572923441-zssb",
    "number": 3
  },
  {
    "id": "c3-1-4-1790572923441-xsz8",
    "classId": "3-1",
    "name": "김지아",
    "number": 4
  },
  {
    "name": "김진우",
    "number": 5,
    "id": "c3-1-5-1790572923441-lzys",
    "classId": "3-1"
  },
  {
    "number": 6,
    "name": "김하민",
    "id": "c3-1-6-1790572923441-r5x2",
    "classId": "3-1"
  },
  {
    "number": 7,
    "classId": "3-1",
    "name": "김희준",
    "id": "c3-1-7-1790572923441-7z5l"
  },
  {
    "name": "나웅찬",
    "number": 8,
    "classId": "3-1",
    "id": "c3-1-8-1790572923441-2noj"
  },
  {
    "number": 10,
    "classId": "3-1",
    "name": "박찬유",
    "id": "c3-1-10-1790572923441-4jk9"
  },
  {
    "number": 11,
    "classId": "3-1",
    "id": "c3-1-11-1790572923441-dngp",
    "name": "서영은"
  },
  {
    "id": "c3-1-12-1790572923441-kgo0",
    "classId": "3-1",
    "number": 12,
    "name": "송유진"
  },
  {
    "name": "오준석",
    "id": "c3-1-13-1790572923441-v66b",
    "number": 13,
    "classId": "3-1"
  },
  {
    "classId": "3-1",
    "name": "우연재",
    "number": 14,
    "id": "c3-1-14-1790572923441-n1pe"
  },
  {
    "classId": "3-1",
    "name": "이연오",
    "id": "c3-1-15-1790572923441-q5tn",
    "number": 15
  },
  {
    "number": 16,
    "name": "이지후",
    "id": "c3-1-16-1790572923441-kh8u",
    "classId": "3-1"
  },
  {
    "name": "이채정",
    "number": 17,
    "classId": "3-1",
    "id": "c3-1-17-1790572923441-moh5"
  },
  {
    "name": "이하진",
    "classId": "3-1",
    "number": 18,
    "id": "c3-1-18-1790572923441-rmpz"
  },
  {
    "classId": "3-1",
    "number": 19,
    "id": "c3-1-19-1790572923441-fabw",
    "name": "이한준"
  },
  {
    "classId": "3-1",
    "number": 20,
    "id": "c3-1-20-1790572923441-v3lp",
    "name": "이효은"
  },
  {
    "classId": "3-1",
    "name": "전제범",
    "number": 21,
    "id": "c3-1-21-1790572923441-3aar"
  },
  {
    "id": "c3-1-22-1790572923441-9t72",
    "name": "정정우",
    "classId": "3-1",
    "number": 22
  },
  {
    "id": "c3-1-23-1790572923441-0dgs",
    "number": 23,
    "name": "정지훈",
    "classId": "3-1"
  },
  {
    "name": "조서윤",
    "id": "c3-1-24-1790572923441-uuvw",
    "classId": "3-1",
    "number": 24
  },
  {
    "id": "c3-1-25-1790572923441-fmv8",
    "classId": "3-1",
    "name": "조윤서",
    "number": 25
  },
  {
    "name": "최현준",
    "classId": "3-1",
    "number": 26,
    "id": "c3-1-26-1790572923441-q463"
  },
  {
    "classId": "3-1",
    "number": 28,
    "id": "c3-1-28-1790572923441-1vb3",
    "name": "한지윤"
  },
  {
    "number": 29,
    "id": "c3-1-29-1790572923441-yqes",
    "classId": "3-1",
    "name": "홍가연"
  },
  {
    "classId": "3-1",
    "id": "c3-1-30-1790572923441-c7yv",
    "number": 30,
    "name": "홍서진"
  },
  {
    "number": 1,
    "name": "권태희",
    "id": "c3-10-1-1790238413433-o3r0",
    "classId": "3-10"
  },
  {
    "name": "김건휘",
    "id": "c3-10-2-1790238413433-5we6",
    "classId": "3-10",
    "number": 2
  },
  {
    "name": "김규린",
    "id": "c3-10-3-1790238413433-hx32",
    "classId": "3-10",
    "number": 3
  },
  {
    "classId": "3-10",
    "number": 4,
    "name": "김나연",
    "id": "c3-10-4-1790238413433-p3il"
  },
  {
    "id": "c3-10-5-1790238413433-svmh",
    "classId": "3-10",
    "number": 5,
    "name": "김수빈"
  },
  {
    "name": "김윤우",
    "id": "c3-10-6-1790238413433-8gnq",
    "classId": "3-10",
    "number": 6
  },
  {
    "number": 7,
    "name": "김윤후",
    "classId": "3-10",
    "id": "c3-10-7-1790238413433-b8wx"
  },
  {
    "id": "c3-10-8-1790238413433-1vy1",
    "number": 8,
    "classId": "3-10",
    "name": "김준우"
  },
  {
    "name": "김진서",
    "id": "c3-10-9-1790238413433-736t",
    "number": 9,
    "classId": "3-10"
  },
  {
    "name": "김한솔",
    "id": "c3-10-10-1790238413433-x6do",
    "number": 10,
    "classId": "3-10"
  },
  {
    "classId": "3-10",
    "number": 11,
    "name": "김현석",
    "id": "c3-10-11-1790238413433-m0t2"
  },
  {
    "id": "c3-10-12-1790238413433-nihr",
    "number": 12,
    "classId": "3-10",
    "name": "류아임"
  },
  {
    "name": "박승아",
    "number": 13,
    "id": "c3-10-13-1790238413433-nuwo",
    "classId": "3-10"
  },
  {
    "name": "박예인",
    "classId": "3-10",
    "number": 14,
    "id": "c3-10-14-1790238413433-0jqw"
  },
  {
    "number": 15,
    "classId": "3-10",
    "name": "백승우",
    "id": "c3-10-15-1790238413433-qiq9"
  },
  {
    "number": 16,
    "id": "c3-10-16-1790238413433-94r8",
    "name": "송은석",
    "classId": "3-10"
  },
  {
    "name": "신소진",
    "classId": "3-10",
    "id": "c3-10-17-1790238413433-cpgy",
    "number": 17
  },
  {
    "classId": "3-10",
    "name": "심하율",
    "id": "c3-10-18-1790238413433-5lw8",
    "number": 18
  },
  {
    "id": "c3-10-19-1790238413433-y4dq",
    "number": 19,
    "classId": "3-10",
    "name": "유지아"
  },
  {
    "number": 20,
    "name": "유하린",
    "id": "c3-10-20-1790238413433-ceye",
    "classId": "3-10"
  },
  {
    "classId": "3-10",
    "number": 21,
    "name": "윤지후",
    "id": "c3-10-21-1790238413433-7uw0"
  },
  {
    "number": 22,
    "id": "c3-10-22-1790238413433-1nup",
    "name": "이승빈",
    "classId": "3-10"
  },
  {
    "number": 23,
    "classId": "3-10",
    "name": "이승연",
    "id": "c3-10-23-1790238413433-ezdq"
  },
  {
    "name": "이윤성",
    "id": "c3-10-24-1790238413433-0fme",
    "classId": "3-10",
    "number": 24
  },
  {
    "number": 25,
    "classId": "3-10",
    "id": "c3-10-25-1790238413433-t91x",
    "name": "이찬혁"
  },
  {
    "name": "장채은",
    "number": 26,
    "classId": "3-10",
    "id": "c3-10-26-1790238413433-a0zj"
  },
  {
    "number": 27,
    "name": "최지민",
    "classId": "3-10",
    "id": "c3-10-27-1790238413433-o6kw"
  },
  {
    "name": "한지혁",
    "id": "c3-10-28-1790238413433-y8kg",
    "classId": "3-10",
    "number": 28
  },
  {
    "name": "홍유빈",
    "classId": "3-10",
    "number": 29,
    "id": "c3-10-29-1790238413433-7gdm"
  },
  {
    "classId": "3-10",
    "name": "황채원",
    "id": "c3-10-30-1790238413433-6s6u",
    "number": 30
  },
  {
    "classId": "3-11",
    "number": 1,
    "id": "c3-11-1-1790238448951-lfaq",
    "name": "김가은"
  },
  {
    "id": "c3-11-2-1790238448951-1k5b",
    "name": "김규림",
    "number": 2,
    "classId": "3-11"
  },
  {
    "id": "c3-11-3-1790238448951-jcxa",
    "classId": "3-11",
    "number": 3,
    "name": "김연준"
  },
  {
    "number": 4,
    "name": "김윤성",
    "classId": "3-11",
    "id": "c3-11-4-1790238448951-wvry"
  },
  {
    "classId": "3-11",
    "number": 5,
    "name": "김주아",
    "id": "c3-11-5-1790238448951-1sp2"
  },
  {
    "name": "박진우",
    "classId": "3-11",
    "number": 7,
    "id": "c3-11-7-1790238448951-c9bg"
  },
  {
    "number": 8,
    "classId": "3-11",
    "id": "c3-11-8-1790238448951-nevn",
    "name": "박한별"
  },
  {
    "name": "백선호",
    "id": "c3-11-9-1790238448951-8ulk",
    "number": 9,
    "classId": "3-11"
  },
  {
    "classId": "3-11",
    "name": "양승범",
    "number": 10,
    "id": "c3-11-10-1790238448951-qrod"
  },
  {
    "name": "엄강후",
    "classId": "3-11",
    "id": "c3-11-11-1790238448951-gt1s",
    "number": 11
  },
  {
    "id": "c3-11-12-1790238448951-3vhh",
    "classId": "3-11",
    "number": 12,
    "name": "유수아"
  },
  {
    "id": "c3-11-13-1790238448951-v2xy",
    "number": 13,
    "name": "유지원",
    "classId": "3-11"
  },
  {
    "classId": "3-11",
    "name": "윤서영",
    "id": "c3-11-14-1790238448951-iavf",
    "number": 14
  },
  {
    "name": "윤준호",
    "number": 15,
    "id": "c3-11-15-1790238448951-8r3j",
    "classId": "3-11"
  },
  {
    "number": 16,
    "id": "c3-11-16-1790238448951-m90o",
    "name": "이가온",
    "classId": "3-11"
  },
  {
    "name": "이수민",
    "id": "c3-11-17-1790238448951-n49e",
    "number": 17,
    "classId": "3-11"
  },
  {
    "id": "c3-11-19-1790238448951-px1h",
    "name": "이우진",
    "number": 19,
    "classId": "3-11"
  },
  {
    "classId": "3-11",
    "name": "이정진",
    "number": 20,
    "id": "c3-11-20-1790238448951-8ywe"
  },
  {
    "name": "이지율",
    "number": 21,
    "id": "c3-11-21-1790238448951-9zqi",
    "classId": "3-11"
  },
  {
    "id": "c3-11-22-1790238448951-kqdh",
    "number": 22,
    "name": "이채은",
    "classId": "3-11"
  },
  {
    "classId": "3-11",
    "number": 23,
    "id": "c3-11-23-1790238448951-sfyh",
    "name": "이태민"
  },
  {
    "name": "임서인",
    "classId": "3-11",
    "number": 24,
    "id": "c3-11-24-1790238448951-qyri"
  },
  {
    "id": "c3-11-25-1790238448951-etv3",
    "name": "장서윤",
    "number": 25,
    "classId": "3-11"
  },
  {
    "name": "정라희",
    "number": 26,
    "classId": "3-11",
    "id": "c3-11-26-1790238448951-ksum"
  },
  {
    "classId": "3-11",
    "number": 27,
    "name": "조하은",
    "id": "c3-11-27-1790238448951-q2o6"
  },
  {
    "number": 28,
    "classId": "3-11",
    "name": "주다민",
    "id": "c3-11-28-1790238448951-yhd6"
  },
  {
    "id": "c3-11-29-1790238448951-5dwf",
    "classId": "3-11",
    "name": "최현호",
    "number": 29
  },
  {
    "classId": "3-11",
    "name": "한유민",
    "number": 30,
    "id": "c3-11-30-1790238448951-qc7e"
  },
  {
    "id": "c3-2-1-1790573070267-xk8l",
    "name": "고하은",
    "number": 1,
    "classId": "3-2"
  },
  {
    "id": "c3-2-2-1790573070267-xy48",
    "number": 2,
    "name": "권리예",
    "classId": "3-2"
  },
  {
    "id": "c3-2-3-1790573070267-8yl9",
    "classId": "3-2",
    "number": 3,
    "name": "김규린"
  },
  {
    "number": 4,
    "name": "김대현",
    "id": "c3-2-4-1790573070267-y8kc",
    "classId": "3-2"
  },
  {
    "id": "c3-2-5-1790573070267-fsfn",
    "number": 5,
    "name": "김시온",
    "classId": "3-2"
  },
  {
    "number": 6,
    "classId": "3-2",
    "id": "c3-2-6-1790573070267-corl",
    "name": "김유나"
  },
  {
    "id": "c3-2-7-1790573070267-tzh8",
    "classId": "3-2",
    "name": "김현서",
    "number": 7
  },
  {
    "id": "c3-2-8-1790573070267-p5yv",
    "classId": "3-2",
    "number": 8,
    "name": "박민준"
  },
  {
    "name": "박해인",
    "classId": "3-2",
    "number": 9,
    "id": "c3-2-9-1790573070267-fvh4"
  },
  {
    "name": "백진우",
    "classId": "3-2",
    "number": 10,
    "id": "c3-2-10-1790573070267-sy1z"
  },
  {
    "id": "c3-2-11-1790573070267-2qkz",
    "classId": "3-2",
    "number": 11,
    "name": "서린"
  },
  {
    "name": "양지안",
    "number": 12,
    "classId": "3-2",
    "id": "c3-2-12-1790573070267-enc3"
  },
  {
    "classId": "3-2",
    "name": "윤서빈",
    "number": 13,
    "id": "c3-2-13-1790573070267-l0om"
  },
  {
    "name": "이동연",
    "id": "c3-2-14-1790573070267-kngn",
    "classId": "3-2",
    "number": 14
  },
  {
    "id": "c3-2-15-1790573070267-q6l4",
    "classId": "3-2",
    "number": 15,
    "name": "이두준"
  },
  {
    "id": "c3-2-16-1790573070267-qthu",
    "name": "이소망",
    "number": 16,
    "classId": "3-2"
  },
  {
    "classId": "3-2",
    "id": "c3-2-17-1790573070267-h1aj",
    "number": 17,
    "name": "이승현"
  },
  {
    "id": "c3-2-18-1790573070267-t8tc",
    "number": 18,
    "name": "이주원",
    "classId": "3-2"
  },
  {
    "number": 19,
    "classId": "3-2",
    "id": "c3-2-19-1790573070267-jb9c",
    "name": "이준서"
  },
  {
    "id": "c3-2-20-1790573070267-nkuz",
    "name": "이하준",
    "classId": "3-2",
    "number": 20
  },
  {
    "number": 21,
    "name": "이하진",
    "classId": "3-2",
    "id": "c3-2-21-1790573070267-qjje"
  },
  {
    "number": 22,
    "classId": "3-2",
    "name": "장지훈",
    "id": "c3-2-22-1790573070267-dek8"
  },
  {
    "id": "c3-2-23-1790573070267-17rg",
    "number": 23,
    "name": "전소율",
    "classId": "3-2"
  },
  {
    "name": "조바인",
    "id": "c3-2-24-1790573070267-h0jr",
    "classId": "3-2",
    "number": 24
  },
  {
    "id": "c3-2-25-1790573070267-gthy",
    "name": "조예나",
    "classId": "3-2",
    "number": 25
  },
  {
    "id": "c3-2-26-1790573070267-4nsf",
    "number": 26,
    "classId": "3-2",
    "name": "조한별"
  },
  {
    "name": "최준호",
    "classId": "3-2",
    "number": 27,
    "id": "c3-2-27-1790573070267-2fjm"
  },
  {
    "name": "한주현",
    "number": 28,
    "classId": "3-2",
    "id": "c3-2-28-1790573070267-lkye"
  },
  {
    "classId": "3-2",
    "id": "c3-2-29-1790573070267-ce5k",
    "name": "홍진유",
    "number": 29
  },
  {
    "name": "황보주한",
    "id": "c3-2-30-1790573070267-i4y7",
    "classId": "3-2",
    "number": 30
  },
  {
    "number": 31,
    "classId": "3-2",
    "id": "c3-2-31-1790573070267-3u0g",
    "name": "이우빈"
  },
  {
    "name": "권강현",
    "classId": "3-3",
    "number": 1,
    "id": "c3-3-1-1790573094784-ltm9"
  },
  {
    "classId": "3-3",
    "number": 2,
    "name": "김민경",
    "id": "c3-3-2-1790573094784-r1fl"
  },
  {
    "number": 3,
    "classId": "3-3",
    "name": "김서진",
    "id": "c3-3-3-1790573094784-1cnk"
  },
  {
    "number": 4,
    "classId": "3-3",
    "name": "김소은",
    "id": "c3-3-4-1790573094784-vrmz"
  },
  {
    "number": 5,
    "classId": "3-3",
    "id": "c3-3-5-1790573094785-whfx",
    "name": "김예은"
  },
  {
    "classId": "3-3",
    "name": "김예찬",
    "id": "c3-3-6-1790573094785-8qn3",
    "number": 6
  },
  {
    "name": "김지호",
    "id": "c3-3-7-1790573094785-d1n5",
    "classId": "3-3",
    "number": 7
  },
  {
    "name": "나효린",
    "id": "c3-3-8-1790573094785-gp3a",
    "number": 8,
    "classId": "3-3"
  },
  {
    "name": "노연후",
    "id": "c3-3-9-1790573094785-5jw2",
    "number": 9,
    "classId": "3-3"
  },
  {
    "name": "박선민",
    "id": "c3-3-10-1790573094785-hec5",
    "classId": "3-3",
    "number": 10
  },
  {
    "name": "박시후",
    "id": "c3-3-11-1790573094785-9gn9",
    "classId": "3-3",
    "number": 11
  },
  {
    "name": "박예서",
    "id": "c3-3-12-1790573094785-a53z",
    "number": 12,
    "classId": "3-3"
  },
  {
    "name": "박윤진",
    "classId": "3-3",
    "id": "c3-3-13-1790573094785-s8s8",
    "number": 13
  },
  {
    "classId": "3-3",
    "id": "c3-3-14-1790573094785-qvwb",
    "number": 14,
    "name": "박지후"
  },
  {
    "id": "c3-3-15-1790573094785-784p",
    "number": 15,
    "name": "백아윤",
    "classId": "3-3"
  },
  {
    "number": 16,
    "classId": "3-3",
    "id": "c3-3-16-1790573094785-7xvy",
    "name": "선태현"
  },
  {
    "id": "c3-3-17-1790573094785-4946",
    "classId": "3-3",
    "name": "심천미",
    "number": 17
  },
  {
    "id": "c3-3-18-1790573094785-5xsd",
    "name": "이동호",
    "classId": "3-3",
    "number": 18
  },
  {
    "name": "이민경",
    "number": 19,
    "classId": "3-3",
    "id": "c3-3-19-1790573094785-j615"
  },
  {
    "name": "이상준",
    "number": 20,
    "id": "c3-3-20-1790573094785-wgwl",
    "classId": "3-3"
  },
  {
    "name": "이연우",
    "classId": "3-3",
    "id": "c3-3-21-1790573094785-xlas",
    "number": 21
  },
  {
    "id": "c3-3-22-1790573094785-cyr2",
    "name": "이주니",
    "number": 22,
    "classId": "3-3"
  },
  {
    "number": 23,
    "name": "임사랑",
    "id": "c3-3-23-1790573094785-8dru",
    "classId": "3-3"
  },
  {
    "id": "c3-3-24-1790573094785-vwj3",
    "classId": "3-3",
    "number": 24,
    "name": "정예진"
  },
  {
    "name": "조겸",
    "id": "c3-3-25-1790573094785-jrxn",
    "number": 25,
    "classId": "3-3"
  },
  {
    "name": "최주원",
    "classId": "3-3",
    "number": 26,
    "id": "c3-3-26-1790573094785-na1c"
  },
  {
    "id": "c3-3-27-1790573094785-twlj",
    "number": 27,
    "name": "한태민",
    "classId": "3-3"
  },
  {
    "classId": "3-3",
    "name": "홍유진",
    "number": 28,
    "id": "c3-3-28-1790573094785-tcgf"
  },
  {
    "id": "c3-3-29-1790573094785-kcpi",
    "number": 29,
    "name": "홍은율",
    "classId": "3-3"
  },
  {
    "name": "한수빈",
    "number": 30,
    "classId": "3-3",
    "id": "c3-3-30-1790573094785-h5kj"
  },
  {
    "number": 1,
    "id": "c3-4-1-1790573116450-pgjr",
    "name": "권오현",
    "classId": "3-4"
  },
  {
    "number": 2,
    "classId": "3-4",
    "name": "길민준",
    "id": "c3-4-2-1790573116450-5824"
  },
  {
    "classId": "3-4",
    "id": "c3-4-4-1790573116450-biiu",
    "number": 4,
    "name": "김도율"
  },
  {
    "name": "김민조",
    "number": 5,
    "id": "c3-4-5-1790573116450-tcs2",
    "classId": "3-4"
  },
  {
    "name": "김민찬",
    "id": "c3-4-6-1790573116450-64cr",
    "number": 6,
    "classId": "3-4"
  },
  {
    "id": "c3-4-7-1790573116450-qy12",
    "number": 7,
    "name": "김예찬",
    "classId": "3-4"
  },
  {
    "classId": "3-4",
    "name": "김지안",
    "number": 8,
    "id": "c3-4-8-1790573116450-1t8k"
  },
  {
    "classId": "3-4",
    "name": "박소율",
    "number": 10,
    "id": "c3-4-10-1790573116450-qf5f"
  },
  {
    "number": 11,
    "classId": "3-4",
    "name": "박시은",
    "id": "c3-4-11-1790573116450-1mjn"
  },
  {
    "number": 12,
    "name": "박지민",
    "id": "c3-4-12-1790573116450-365n",
    "classId": "3-4"
  },
  {
    "classId": "3-4",
    "number": 13,
    "id": "c3-4-13-1790573116450-fjak",
    "name": "박효은"
  },
  {
    "name": "방서윤",
    "id": "c3-4-14-1790573116450-aame",
    "number": 14,
    "classId": "3-4"
  },
  {
    "classId": "3-4",
    "number": 15,
    "name": "송별하",
    "id": "c3-4-15-1790573116450-479o"
  },
  {
    "id": "c3-4-16-1790573116450-mw6v",
    "number": 16,
    "classId": "3-4",
    "name": "신라헬"
  },
  {
    "classId": "3-4",
    "name": "안도현",
    "number": 17,
    "id": "c3-4-17-1790573116450-adxs"
  },
  {
    "classId": "3-4",
    "number": 18,
    "id": "c3-4-18-1790573116450-wp40",
    "name": "양은채"
  },
  {
    "number": 19,
    "id": "c3-4-19-1790573116450-gxik",
    "classId": "3-4",
    "name": "유윤태"
  },
  {
    "name": "윤나슬",
    "id": "c3-4-20-1790573116450-ql25",
    "number": 20,
    "classId": "3-4"
  },
  {
    "id": "c3-4-21-1790573116450-hfx3",
    "classId": "3-4",
    "name": "이윤지",
    "number": 21
  },
  {
    "id": "c3-4-22-1790573116450-a3qy",
    "classId": "3-4",
    "name": "이정준",
    "number": 22
  },
  {
    "name": "이찬빈",
    "number": 23,
    "id": "c3-4-23-1790573116450-6g8s",
    "classId": "3-4"
  },
  {
    "number": 24,
    "classId": "3-4",
    "name": "정윤성",
    "id": "c3-4-24-1790573116450-xap7"
  },
  {
    "number": 25,
    "id": "c3-4-25-1790573116450-kup7",
    "classId": "3-4",
    "name": "최민아"
  },
  {
    "id": "c3-4-26-1790573116450-3d9h",
    "classId": "3-4",
    "number": 26,
    "name": "최서영"
  },
  {
    "classId": "3-4",
    "number": 27,
    "name": "표민성",
    "id": "c3-4-27-1790573116450-22wp"
  },
  {
    "number": 28,
    "id": "c3-4-28-1790573116450-ujjs",
    "name": "한재희",
    "classId": "3-4"
  },
  {
    "name": "홍석윤",
    "id": "c3-4-29-1790573116450-mqa1",
    "number": 29,
    "classId": "3-4"
  },
  {
    "id": "c3-5-1-1790573133541-wgqa",
    "classId": "3-5",
    "name": "강지민",
    "number": 1
  },
  {
    "name": "강지우",
    "classId": "3-5",
    "id": "c3-5-2-1790573133541-qss9",
    "number": 2
  },
  {
    "name": "경수현",
    "id": "c3-5-3-1790573133541-my8t",
    "classId": "3-5",
    "number": 3
  },
  {
    "name": "고병완",
    "number": 4,
    "classId": "3-5",
    "id": "c3-5-4-1790573133541-i8pb"
  },
  {
    "classId": "3-5",
    "number": 5,
    "name": "김민채",
    "id": "c3-5-5-1790573133541-5wiu"
  },
  {
    "number": 6,
    "name": "김유근",
    "classId": "3-5",
    "id": "c3-5-6-1790573133541-5iyo"
  },
  {
    "name": "김채윤",
    "id": "c3-5-7-1790573133541-3wb3",
    "number": 7,
    "classId": "3-5"
  },
  {
    "classId": "3-5",
    "number": 9,
    "id": "c3-5-9-1790573133541-6swd",
    "name": "박재영"
  },
  {
    "name": "박지호",
    "number": 10,
    "classId": "3-5",
    "id": "c3-5-10-1790573133541-9uuq"
  },
  {
    "classId": "3-5",
    "number": 11,
    "id": "c3-5-11-1790573133541-0r4v",
    "name": "박태영"
  },
  {
    "id": "c3-5-12-1790573133541-p5gg",
    "classId": "3-5",
    "number": 12,
    "name": "엄채윤"
  },
  {
    "number": 13,
    "classId": "3-5",
    "name": "오가은",
    "id": "c3-5-13-1790573133541-sbby"
  },
  {
    "classId": "3-5",
    "id": "c3-5-14-1790573133541-aegx",
    "number": 14,
    "name": "유연재"
  },
  {
    "name": "이강인",
    "classId": "3-5",
    "id": "c3-5-15-1790573133541-bs4z",
    "number": 15
  },
  {
    "classId": "3-5",
    "number": 16,
    "id": "c3-5-16-1790573133541-uml1",
    "name": "이은아"
  },
  {
    "classId": "3-5",
    "number": 17,
    "name": "이정재",
    "id": "c3-5-17-1790573133541-w2je"
  },
  {
    "name": "이한준",
    "number": 18,
    "id": "c3-5-18-1790573133541-fzv5",
    "classId": "3-5"
  },
  {
    "number": 19,
    "classId": "3-5",
    "id": "c3-5-19-1790573133541-b30y",
    "name": "전명준"
  },
  {
    "classId": "3-5",
    "id": "c3-5-20-1790573133541-8hpp",
    "number": 20,
    "name": "전하윤"
  },
  {
    "id": "c3-5-21-1790573133541-334a",
    "name": "정예서",
    "number": 21,
    "classId": "3-5"
  },
  {
    "name": "정지윤",
    "number": 22,
    "classId": "3-5",
    "id": "c3-5-22-1790573133541-559q"
  },
  {
    "number": 23,
    "id": "c3-5-23-1790573133541-5ic1",
    "name": "조연우",
    "classId": "3-5"
  },
  {
    "name": "최준영",
    "id": "c3-5-24-1790573133541-1dq5",
    "number": 24,
    "classId": "3-5"
  },
  {
    "id": "c3-5-25-1790573133541-z580",
    "classId": "3-5",
    "number": 25,
    "name": "최지윤"
  },
  {
    "name": "최한샘",
    "id": "c3-5-26-1790573133541-om4d",
    "classId": "3-5",
    "number": 26
  },
  {
    "classId": "3-5",
    "id": "c3-5-27-1790573133541-0ir8",
    "name": "허진우",
    "number": 27
  },
  {
    "id": "c3-5-28-1790573133541-y28y",
    "name": "황인영",
    "classId": "3-5",
    "number": 28
  },
  {
    "name": "김은정",
    "classId": "3-5",
    "id": "c3-5-29-1790573133541-oq7o",
    "number": 29
  },
  {
    "number": 1,
    "id": "c3-6-1-1790573151700-ovju",
    "classId": "3-6",
    "name": "고유담"
  },
  {
    "id": "c3-6-2-1790573151700-v66w",
    "name": "국하연",
    "classId": "3-6",
    "number": 2
  },
  {
    "number": 3,
    "classId": "3-6",
    "name": "김민서",
    "id": "c3-6-3-1790573151700-r3cl"
  },
  {
    "name": "김우빈",
    "id": "c3-6-4-1790573151700-kcwl",
    "number": 4,
    "classId": "3-6"
  },
  {
    "id": "c3-6-5-1790573151700-5gb5",
    "name": "김태원",
    "classId": "3-6",
    "number": 5
  },
  {
    "number": 6,
    "id": "c3-6-6-1790573151700-qgtf",
    "classId": "3-6",
    "name": "박강율"
  },
  {
    "name": "박민재",
    "id": "c3-6-7-1790573151700-2ues",
    "classId": "3-6",
    "number": 7
  },
  {
    "number": 8,
    "name": "방지우",
    "id": "c3-6-8-1790573151700-8yf0",
    "classId": "3-6"
  },
  {
    "id": "c3-6-9-1790573151700-lpwy",
    "classId": "3-6",
    "number": 9,
    "name": "석윤슬"
  },
  {
    "id": "c3-6-10-1790573151700-stcs",
    "name": "성예지",
    "number": 10,
    "classId": "3-6"
  },
  {
    "number": 11,
    "classId": "3-6",
    "id": "c3-6-11-1790573151700-hn4d",
    "name": "신현준"
  },
  {
    "classId": "3-6",
    "number": 12,
    "id": "c3-6-12-1790573151700-j01o",
    "name": "신훈민"
  },
  {
    "classId": "3-6",
    "name": "안신영",
    "number": 13,
    "id": "c3-6-13-1790573151700-z47d"
  },
  {
    "id": "c3-6-14-1790573151700-dm2v",
    "name": "원승규",
    "number": 14,
    "classId": "3-6"
  },
  {
    "name": "윤재원",
    "classId": "3-6",
    "number": 15,
    "id": "c3-6-15-1790573151700-ybye"
  },
  {
    "classId": "3-6",
    "name": "이유민",
    "id": "c3-6-16-1790573151700-wkn6",
    "number": 16
  },
  {
    "classId": "3-6",
    "name": "이종관",
    "number": 17,
    "id": "c3-6-17-1790573151700-84jg"
  },
  {
    "name": "임대원",
    "id": "c3-6-18-1790573151700-o68k",
    "number": 18,
    "classId": "3-6"
  },
  {
    "name": "임시아",
    "number": 19,
    "id": "c3-6-19-1790573151700-m2zj",
    "classId": "3-6"
  },
  {
    "name": "임여빈",
    "id": "c3-6-20-1790573151700-pjx5",
    "number": 20,
    "classId": "3-6"
  },
  {
    "classId": "3-6",
    "name": "임지언",
    "id": "c3-6-21-1790573151700-65u0",
    "number": 21
  },
  {
    "id": "c3-6-22-1790573151700-k650",
    "name": "전준우",
    "classId": "3-6",
    "number": 22
  },
  {
    "id": "c3-6-23-1790573151700-3ket",
    "number": 23,
    "classId": "3-6",
    "name": "정재호"
  },
  {
    "id": "c3-6-24-1790573151700-whx2",
    "classId": "3-6",
    "number": 24,
    "name": "조승우"
  },
  {
    "classId": "3-6",
    "number": 25,
    "id": "c3-6-25-1790573151700-0ehq",
    "name": "조희연"
  },
  {
    "name": "조희원",
    "classId": "3-6",
    "number": 26,
    "id": "c3-6-26-1790573151700-vczt"
  },
  {
    "classId": "3-6",
    "number": 27,
    "name": "최서우",
    "id": "c3-6-27-1790573151700-rapp"
  },
  {
    "classId": "3-6",
    "number": 28,
    "name": "최태민",
    "id": "c3-6-28-1790573151700-2tld"
  },
  {
    "id": "c3-6-29-1790573151700-cmrw",
    "classId": "3-6",
    "number": 29,
    "name": "하은율"
  },
  {
    "classId": "3-6",
    "name": "황다연",
    "number": 30,
    "id": "c3-6-30-1790573151700-kwrs"
  },
  {
    "id": "c3-7-1-1790149305528-svy3",
    "name": "강민우",
    "number": 1,
    "classId": "3-7"
  },
  {
    "name": "강보경",
    "classId": "3-7",
    "id": "c3-7-2-1790149305528-0sjs",
    "number": 2
  },
  {
    "number": 3,
    "id": "c3-7-3-1790149305528-0c28",
    "classId": "3-7",
    "name": "강윤성"
  },
  {
    "id": "c3-7-4-1790149305528-9c8s",
    "classId": "3-7",
    "name": "권예준",
    "number": 4
  },
  {
    "id": "c3-7-5-1790149305528-gseq",
    "name": "김다빈",
    "classId": "3-7",
    "number": 5
  },
  {
    "name": "김아정",
    "classId": "3-7",
    "id": "c3-7-7-1790149305528-r2ck",
    "number": 7
  },
  {
    "number": 8,
    "id": "c3-7-8-1790149305528-lxkk",
    "classId": "3-7",
    "name": "김은서"
  },
  {
    "name": "김지우",
    "id": "c3-7-9-1790149305528-ph8j",
    "number": 9,
    "classId": "3-7"
  },
  {
    "id": "c3-7-10-1790149305528-htao",
    "name": "김하진",
    "number": 10,
    "classId": "3-7"
  },
  {
    "classId": "3-7",
    "name": "박건희",
    "number": 11,
    "id": "c3-7-11-1790149305528-qy9f"
  },
  {
    "name": "박상준",
    "id": "c3-7-12-1790149305528-lcyu",
    "classId": "3-7",
    "number": 12
  },
  {
    "number": 13,
    "name": "박서연",
    "classId": "3-7",
    "id": "c3-7-13-1790149305528-hibj"
  },
  {
    "name": "박지우",
    "id": "c3-7-14-1790149305528-i4b1",
    "number": 14,
    "classId": "3-7"
  },
  {
    "number": 15,
    "id": "c3-7-15-1790149305528-482c",
    "classId": "3-7",
    "name": "신진호"
  },
  {
    "id": "c3-7-16-1790149305528-p439",
    "name": "유수아",
    "classId": "3-7",
    "number": 16
  },
  {
    "id": "c3-7-17-1790149305528-6d67",
    "name": "이동규",
    "number": 17,
    "classId": "3-7"
  },
  {
    "number": 18,
    "id": "c3-7-18-1790149305528-wbkp",
    "classId": "3-7",
    "name": "이소율"
  },
  {
    "id": "c3-7-19-1790149305528-l62a",
    "name": "이연재",
    "number": 19,
    "classId": "3-7"
  },
  {
    "name": "이영일",
    "id": "c3-7-20-1790149305528-txnq",
    "number": 20,
    "classId": "3-7"
  },
  {
    "number": 21,
    "id": "c3-7-21-1790149305528-5ut4",
    "classId": "3-7",
    "name": "이예성"
  },
  {
    "id": "c3-7-22-1790149305528-a0of",
    "classId": "3-7",
    "name": "이정태",
    "number": 22
  },
  {
    "classId": "3-7",
    "number": 23,
    "id": "c3-7-23-1790149305528-xncc",
    "name": "이제원"
  },
  {
    "classId": "3-7",
    "number": 24,
    "name": "이준서",
    "id": "c3-7-24-1790149305528-guqu"
  },
  {
    "id": "c3-7-25-1790149305528-n2ih",
    "classId": "3-7",
    "number": 25,
    "name": "이하린"
  },
  {
    "id": "c3-7-26-1790149305528-ldi6",
    "name": "임승현",
    "number": 26,
    "classId": "3-7"
  },
  {
    "name": "정지운",
    "number": 27,
    "id": "c3-7-27-1790149305528-kip1",
    "classId": "3-7"
  },
  {
    "number": 28,
    "id": "c3-7-28-1790149305528-to40",
    "classId": "3-7",
    "name": "조승우"
  },
  {
    "id": "c3-7-29-1790149305528-dqu0",
    "number": 29,
    "name": "최지우",
    "classId": "3-7"
  },
  {
    "id": "c3-7-30-1790149305528-iawi",
    "name": "한재훈",
    "classId": "3-7",
    "number": 30
  },
  {
    "classId": "3-7",
    "name": "허효민",
    "number": 31,
    "id": "c3-7-31-1790149305528-55nk"
  },
  {
    "name": "강리원",
    "id": "c3-8-1-1790238336983-5j3r",
    "number": 1,
    "classId": "3-8"
  },
  {
    "number": 2,
    "id": "c3-8-2-1790238336983-083n",
    "classId": "3-8",
    "name": "곽서준"
  },
  {
    "number": 4,
    "classId": "3-8",
    "name": "김리후",
    "id": "c3-8-4-1790238336983-e6fv"
  },
  {
    "name": "김무경",
    "classId": "3-8",
    "id": "c3-8-5-1790238336983-a017",
    "number": 5
  },
  {
    "name": "김서진",
    "number": 6,
    "id": "c3-8-6-1790238336983-qjrf",
    "classId": "3-8"
  },
  {
    "name": "김승완",
    "classId": "3-8",
    "id": "c3-8-7-1790238336983-5p3d",
    "number": 7
  },
  {
    "number": 8,
    "classId": "3-8",
    "name": "김재윤",
    "id": "c3-8-8-1790238336983-ymyp"
  },
  {
    "name": "박소망",
    "number": 9,
    "classId": "3-8",
    "id": "c3-8-9-1790238336983-f6yk"
  },
  {
    "number": 10,
    "id": "c3-8-10-1790238336983-b8ks",
    "name": "박소율",
    "classId": "3-8"
  },
  {
    "name": "박수빈",
    "classId": "3-8",
    "id": "c3-8-11-1790238336983-uymk",
    "number": 11
  },
  {
    "classId": "3-8",
    "number": 12,
    "name": "박시우",
    "id": "c3-8-12-1790238336983-jv8b"
  },
  {
    "name": "박시은",
    "classId": "3-8",
    "number": 13,
    "id": "c3-8-13-1790238336983-1ftn"
  },
  {
    "name": "박지훈",
    "number": 14,
    "classId": "3-8",
    "id": "c3-8-14-1790238336983-an3z"
  },
  {
    "classId": "3-8",
    "number": 15,
    "id": "c3-8-15-1790238336983-9cfu",
    "name": "배세영"
  },
  {
    "id": "c3-8-16-1790238336983-s4tx",
    "classId": "3-8",
    "name": "백서윤",
    "number": 16
  },
  {
    "classId": "3-8",
    "name": "백인우",
    "number": 17,
    "id": "c3-8-17-1790238336983-68v1"
  },
  {
    "number": 18,
    "classId": "3-8",
    "name": "사공린",
    "id": "c3-8-18-1790238336983-6659"
  },
  {
    "number": 19,
    "classId": "3-8",
    "id": "c3-8-19-1790238336983-5ilg",
    "name": "송아윤"
  },
  {
    "id": "c3-8-20-1790238336983-rpfv",
    "number": 20,
    "classId": "3-8",
    "name": "송예준"
  },
  {
    "classId": "3-8",
    "name": "신예나",
    "id": "c3-8-21-1790238336983-o0jd",
    "number": 21
  },
  {
    "name": "위하린",
    "classId": "3-8",
    "number": 22,
    "id": "c3-8-22-1790238336983-wrs2"
  },
  {
    "number": 23,
    "id": "c3-8-23-1790238336983-bt68",
    "classId": "3-8",
    "name": "이예은"
  },
  {
    "id": "c3-8-24-1790238336983-4t2r",
    "name": "장윤성",
    "number": 24,
    "classId": "3-8"
  },
  {
    "name": "장준영",
    "classId": "3-8",
    "number": 25,
    "id": "c3-8-25-1790238336983-zbrd"
  },
  {
    "classId": "3-8",
    "id": "c3-8-26-1790238336983-d9bz",
    "number": 26,
    "name": "장지훈"
  },
  {
    "name": "조민주",
    "id": "c3-8-27-1790238336983-l9so",
    "number": 27,
    "classId": "3-8"
  },
  {
    "name": "조윤찬",
    "number": 28,
    "id": "c3-8-28-1790238336983-h88k",
    "classId": "3-8"
  },
  {
    "name": "조은찬",
    "id": "c3-8-29-1790238336983-t7se",
    "number": 29,
    "classId": "3-8"
  },
  {
    "classId": "3-8",
    "name": "최서율",
    "number": 30,
    "id": "c3-8-30-1790238336983-tufm"
  },
  {
    "classId": "3-9",
    "number": 1,
    "name": "김동규",
    "id": "c3-9-1-1790238378617-j4vw"
  },
  {
    "classId": "3-9",
    "number": 2,
    "name": "김시후",
    "id": "c3-9-2-1790238378617-efqf"
  },
  {
    "id": "c3-9-3-1790238378617-m0qc",
    "classId": "3-9",
    "number": 3,
    "name": "김연우"
  },
  {
    "name": "김태연",
    "classId": "3-9",
    "id": "c3-9-4-1790238378617-qn5l",
    "number": 4
  },
  {
    "name": "김태호",
    "classId": "3-9",
    "number": 5,
    "id": "c3-9-5-1790238378617-7o8b"
  },
  {
    "number": 6,
    "classId": "3-9",
    "name": "김현서",
    "id": "c3-9-6-1790238378617-x0bh"
  },
  {
    "id": "c3-9-7-1790238378617-91ql",
    "name": "김효중",
    "number": 7,
    "classId": "3-9"
  },
  {
    "name": "남준휘",
    "number": 8,
    "id": "c3-9-8-1790238378617-yz75",
    "classId": "3-9"
  },
  {
    "classId": "3-9",
    "number": 9,
    "name": "박소은",
    "id": "c3-9-9-1790238378617-qozr"
  },
  {
    "name": "박시우",
    "classId": "3-9",
    "number": 10,
    "id": "c3-9-10-1790238378617-m1wk"
  },
  {
    "id": "c3-9-11-1790238378617-eoj9",
    "number": 11,
    "name": "박해윤",
    "classId": "3-9"
  },
  {
    "classId": "3-9",
    "number": 12,
    "name": "안효인",
    "id": "c3-9-12-1790238378617-ydak"
  },
  {
    "number": 13,
    "classId": "3-9",
    "id": "c3-9-13-1790238378617-1r64",
    "name": "연서준"
  },
  {
    "name": "우승율",
    "classId": "3-9",
    "number": 14,
    "id": "c3-9-14-1790238378617-u4u7"
  },
  {
    "id": "c3-9-15-1790238378617-2fd9",
    "number": 15,
    "name": "우인성",
    "classId": "3-9"
  },
  {
    "classId": "3-9",
    "number": 16,
    "id": "c3-9-16-1790238378617-ir84",
    "name": "유하진"
  },
  {
    "name": "이선효",
    "id": "c3-9-17-1790238378617-1kln",
    "number": 17,
    "classId": "3-9"
  },
  {
    "number": 18,
    "classId": "3-9",
    "name": "이소율",
    "id": "c3-9-18-1790238378617-sxwq"
  },
  {
    "id": "c3-9-19-1790238378617-0wk3",
    "name": "이슬비",
    "number": 19,
    "classId": "3-9"
  },
  {
    "name": "이승원",
    "number": 20,
    "id": "c3-9-20-1790238378617-wnc3",
    "classId": "3-9"
  },
  {
    "number": 21,
    "id": "c3-9-21-1790238378617-z19b",
    "classId": "3-9",
    "name": "이예은"
  },
  {
    "id": "c3-9-22-1790238378617-7zfr",
    "name": "이예찬",
    "number": 22,
    "classId": "3-9"
  },
  {
    "number": 23,
    "classId": "3-9",
    "name": "이재윤",
    "id": "c3-9-23-1790238378617-31ji"
  },
  {
    "number": 24,
    "name": "이호준",
    "classId": "3-9",
    "id": "c3-9-24-1790238378617-fftc"
  },
  {
    "classId": "3-9",
    "name": "임제민",
    "number": 25,
    "id": "c3-9-25-1790238378617-0kzh"
  },
  {
    "id": "c3-9-26-1790238378617-puau",
    "name": "장온유",
    "number": 26,
    "classId": "3-9"
  },
  {
    "number": 27,
    "classId": "3-9",
    "name": "조혜리",
    "id": "c3-9-27-1790238378617-0ybz"
  },
  {
    "name": "주유찬",
    "classId": "3-9",
    "number": 28,
    "id": "c3-9-28-1790238378617-o4r6"
  },
  {
    "classId": "3-9",
    "name": "최지우",
    "number": 29,
    "id": "c3-9-29-1790238378617-t06d"
  },
  {
    "id": "c3-9-30-1790238378617-8jnz",
    "number": 30,
    "classId": "3-9",
    "name": "홍유경"
  }
];
}

export function getDefaultSessionQuestions(): Record<number, string> {
  return {
    1: '오늘 농구공을 다루면서 가장 중요하다고 느낀 기본 감각(손가락 터치, 시선 유지 등)은 무엇인가요?',
    2: '미들슛을 던질 때 무릎을 부드럽게 굽혔다 펴는 하체 반동(Dip)이 슛 비거리에 어떤 영향을 주었나요?',
    3: '공을 릴리스할 때 타점(Set Point)을 가슴보다 높은 이마 위쪽에서 유지해야 하는 이유는 무엇일까요?',
    4: '슛을 던진 직후 팔을 림 쪽으로 끝까지 뻗는 \'팔로우 스로우\' 자세가 공의 방향성과 포물선에 어떤 도움을 주나요?',
    5: '슛 릴리스 순간 손목 스냅(Goose Neck)을 부드럽게 꺾어주었을 때 공의 백스핀(역회전)은 어떻게 나타났나요?',
    6: '미들슛 4대 평가기준 중 오늘 본인이 가장 자신 있게 성공한 동작과 더 보완이 필요한 동작은 무엇인가요?',
    7: '레이업슛을 시도할 때 1-2 스텝을 리듬감 있게 밟았을 때와 스텝이 꼬였을 때 어떤 차이가 느껴졌나요?',
    8: '레이업슛 시 림을 직접 노리는 것보다 백보드 사각형 상단 모서리를 겨냥할 때 슛 성공률이 높아지는 이유는 무엇일까요?',
    9: '레이업 점프 시 안쪽 다리 무릎을 가슴 높이로 힘차게 차올리는 동작이 수직 체공 시간 확보에 어떤 도움이 되었나요?',
    10: '드리블-캐치-스텝-점프까지 끊김 없이 유기적으로 연결하기 위해 가장 신경 써야 할 타이밍은 언제였나요?',
    11: '골밑 돌파 레이업슛을 시도할 때 수비수와의 거리나 착지 안정성을 위해 개선하고 싶은 점은 무엇인가요?',
    12: '수비수의 위치에 따라 외곽 미들 점프슛과 돌파 레이업슛 중 어떤 선택이 더 유리할까요?',
    13: '동료의 슛 자세를 관찰하고 피드백을 주고받으면서 새롭게 발견한 나의 슛 습관이나 개선점은 무엇인가요?',
    14: '실전 슈팅 연습이나 별빛 버저비터 게임을 진행하며 집중력과 자세 일관성을 유지하기 위해 어떤 노력을 했나요?',
    15: '3:3 미니 게임 중 찬스가 났을 때 배운 슛 폼을 침착하게 유지하며 슛을 시도할 수 있었나요?',
    16: '오늘 경기에서 팀원과의 패스 연결 후 이어진 슛 찬스에서 가장 기억에 남는 순간은 무엇인가요?',
    17: '1차시부터 17차시까지 농구 수업을 거치며 나의 슛 자세와 체육 수업 태도에서 가장 크게 성장한 부분은 무엇인가요?'
  };
}

export function getDefaultFeedbacks(): FeedbackItem[] {
  return (initialFeedbacks as FeedbackItem[]) || [];
}

export function getDefaultAppState(): AppStateData {
  return {
    classes: getDefaultClasses(),
    students: getDefaultStudents(),
    feedbacks: getDefaultFeedbacks(),
    aiEvaluations: {},
    teacherQuestions: {},
    sessionQuestions: getDefaultSessionQuestions(),
    classSessionQuestions: {},
    studentAnswers: {},
    activeSessions: {}
  };
}
