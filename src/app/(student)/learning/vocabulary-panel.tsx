import { vocabularyWords } from "@/lib/api/learning";
import { VocabularyClient } from "./vocabulary-client";
export async function VocabularyPanel({userid}:{userid:string}){return <VocabularyClient allWords={await vocabularyWords()} savedWordIds={[]} customCards={[]}/>;}
