import json
import time
import requests
from tqdm import tqdm
from google import genai
from google.genai import types
# import google.generativeai as genai

import os

files = os.listdir("deptJsons")
    
    # Filter files with the specified suffix
filtered_files = [file for file in files if file.endswith("shuffled.json")]

deptDict = {"01": "急诊科",
     "02": "心内科",
     "03": "心外科",
     "04": "神内科",
     "05": "肾内科",
     "06": "骨科",
     "07": "ICU重症科",
     "08": "儿科",
     "09": "产前科",
     "10": "新生儿科",
     "11": "呼吸内科",
     "12": "儿外科",
     "13": "罕见病科"}

# Configuration
# API_URL = "http://127.0.0.1:11434/api/generate"
# MODEL = "deepseek-r1:32b"
client = genai.Client(api_key="AIzaSyDwBIdc_**********floAvPNV4LiXH0-0")
# GOOGLE_API_KEY = "AIzaSyDwBIdc_k3CIiK1Ev0floAvPNV4LiXH0-0"
# genai.configure(api_key=GOOGLE_API_KEY)
# MODEL = "gemini-2.0-flash"
MODEL = "gemini-2.0-flash-thinking-exp-01-21"
BATCH_SIZE = 5

def read_questions_and_answers(file_path):
    """Read questions from JSON file"""
    file_path2 = os.path.join("deptJsons/", file_path)
    with open(file_path2, 'r', encoding="utf-8") as f:
        return json.load(f)


def rate_answers(question, answers_dict, thisDept):
    # model = genai.GenerativeModel(MODEL)  # Choose an appropriate Gemini model

    # Constructing the prompt dynamically
    prompt = f"""    

    Question: {question}

    Answers:
    """ + "\n".join([f"{key}: {answer}" for key, answer in answers_dict.items()]) + """

    Provide a JSON response in the format:
    {"ratings": {"key1": score1, "key2": score2, ..., "key6": score6}}
    """
    sys_instruct = f"""你是 {thisDept} 主任。现在要对一组大语言模型回答的关于贵科的医学问题进行评分。 
    Rate each of the following answers from 0 to 10 based on correctness, completeness, and relevance to the question.
    请以内容质量（而非长短）评价分数。评价答案应基于题干信息。
    评分标准：【0分】：无任何医学知识,【0.5-1.5分】：未受专业训练但较留意关注医学,【2-3.5分】：医学院刚毕业但缺乏实践,【4-6.5分】：专培至主冶,【7-8分】：达三甲医院副高、副主任水平,【8.5-9分】：达到三甲医院正高、正主任水平,【9.5-10】：达到有影响力的学科带头人、全国主委、副主委等水平"""

    print(sys_instruct)

    response = client.models.generate_content(
        model=MODEL,
        config=types.GenerateContentConfig(
            system_instruction=sys_instruct),
        contents=prompt
    )
    raw_response = response.text.strip()

    # Remove backticks if present
    if raw_response.startswith("```json"):
        raw_response = raw_response[7:]  # Remove ```json
    if raw_response.endswith("```"):
        raw_response = raw_response[:-3]  # Remove closing ```
    # response = model.generate_content(prompt)

    # Try to parse the response into JSON
    try:
        ratings = json.loads(raw_response)
        return ratings.get("ratings", {})
    except json.JSONDecodeError:
        return {"error": "Failed to parse API response"}

def process_questions_and_answers(questions, output_file, thisDept):
    """Process all questions and store responses"""
    results = {}
    batch_number = 1
    
    for i, qID in enumerate(tqdm(questions, desc="Processing questions")):
        # if i < 500:
        #     continue
        question = questions[qID]
        theQuestion = question["text"]
        theAnswers = question["modelResponses"]

        theseRatings = rate_answers(theQuestion, theAnswers, thisDept)

        print(f"\nquestion [{i}]\t[{time.strftime('%Y-%m-%d %H:%M:%S')}]\tQID=[{qID}]\n")

        if theseRatings:
            results[qID] = theseRatings
            print(theseRatings)
            # .append({
            #     "qID": ,
            #     "response": theseRatings
            # })
            # print(f"Response preview: {response.text[:100]}...")
            
            # Save after each response
            with open(output_file, 'a', encoding="utf-8") as f:
                json.dump({
                    "question": question,
                    "qID": qID,
                    "response": theseRatings
                }, f, ensure_ascii=False)
                f.write("\n")
            
            # Save batch every 50 responses
            if (i + 1) % BATCH_SIZE == 0:
                save_incremental_results(results, output_file, batch_number)
                batch_number += 1
                # results = []  # Reset for next batch
    
    # Save any remaining results
    if results:
        save_incremental_results(results, output_file, batch_number)
    
    return results

def save_incremental_results(results, output_file, batch_number):
    """Save results to intermediate JSON file"""
    batch_file = f"{output_file.split('_')[0]}_batch_{batch_number}.json"
    with open(batch_file, 'w', encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f"Saved intermediate results to {batch_file}")

def save_results(results, output_file):
    """Save results to final JSON file"""
    with open(output_file, 'w', encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f"Saved final results to {output_file}")

def main():
    # input_file = "question_675_shuffled.json"
    # output_file = "tmp.json"
    fileNum = 0
    for input_file in filtered_files:
        fileNum+=1
        if fileNum<5:
            print(f"skipping [{fileNum}]:{input_file}")
            continue
        print("Reading questions and answers...")
        QandAs = read_questions_and_answers(input_file)

        output_file = input_file.replace("deptAnswers", "Gemini2F.rate")
        print(f"will output to [{output_file}]")
        print("Processing questions...")
        # Clear output file before starting
        thisDept = deptDict[input_file[12:14]]
        print(f"thisDept=[{thisDept}]")
        open(output_file, 'w').close()

        results = process_questions_and_answers(QandAs, output_file, thisDept)
    
        print("Saving results...")
        save_results(results, output_file)
    
    print(f"Completed! Results saved to {output_file}")

if __name__ == "__main__":
    main()
