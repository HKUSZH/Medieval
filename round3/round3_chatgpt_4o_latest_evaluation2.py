import json
import os
import re
from tqdm import tqdm
from openai import OpenAI
import time

files = os.listdir("deptJsons")
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

#钟程gpt
client = OpenAI(
    api_key="sk-**********0bot902014C6100aD64473Aa77De604bDfF348",
    base_url="https://api.bltcy.ai/v1/",
)


BATCH_SIZE = 5

def read_questions_and_answers(file_path):
    file_path2 = os.path.join("deptJsons/", file_path)
    with open(file_path2, 'r', encoding="utf-8") as f:
        return json.load(f)


def rate_answers(question, answers_dict, thisDept):

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


    response = client.chat.completions.create(
        model="chatgpt-4o-latest",
        messages=[
            {"role": "system", "content": sys_instruct},
            {"role": "user", "content": prompt}
        ],
    )

    raw_response = response.choices[0].message.content

    #我的提取 rating
    match = re.search(r'"ratings": \{.*?\}', raw_response, re.DOTALL)

    if match:
        json_str = '{' + match.group(0) + '}'  # 手动加上外层的大括号
        data = json.loads(json_str)
        return data.get("ratings", {})
    else:
        return {}

def process_questions_and_answers(questions, output_file, thisDept):
    """Process all questions and store responses"""
    results = {}
    failed_results=[]
    batch_number = 1
    
    for i, qID in enumerate(tqdm(questions, desc="Processing questions")):
        question = questions[qID]
        theQuestion = question["text"]
        theAnswers = question["modelResponses"]

        theseRatings = rate_answers(theQuestion, theAnswers, thisDept)


        print(f"\nquestion [{i}]\t")

        if theseRatings:
            results[qID] = theseRatings
            print(theseRatings)

            if (i+1)%2==0:
                print("休息10秒")
                time.sleep(10)

            # 每一轮都存
            save_incremental_results(results, output_file, batch_number)
            batch_number += 1

        else:
            print('failed')
            failed_results.append(question)

    
    # Save any remaining results
    if results:
        save_incremental_results(results, output_file, batch_number)
    
    return results,failed_results

def read_department(output_file):
    pattern =  r"chatgpt_4o\.rate\.\d+\.(.*?)_shuffled\.json"
    match = re.search(pattern, output_file)
    # print(match.group(1))
    return match.group(1)


def save_incremental_results(results, output_file, batch_number):
    # output_file 'deepseek_671.rate.01.AE_shuffled.json'
    # batch_file  'deepseek_batch_33.json'
    department=read_department(output_file)
    folder_name = './all_solutions_chatgpt/'+department
    if not os.path.exists(folder_name):
        os.makedirs(folder_name)

    batch_file = f"{output_file.split('_')[0]}_batch_{batch_number}.json"
    file_name=folder_name+'/'+batch_file
    with open(file_name, 'w', encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f"Saved intermediate results to {batch_file}")

def save_results(results, output_file):
    """Save results to final JSON file"""
    folder_name = './all_solutions_chatgpt_final'
    if not os.path.exists(folder_name):
        os.makedirs(folder_name)

    final_name = folder_name + '/' + output_file
    with open(final_name, 'w', encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f"Saved final results to {final_name}")

def save_failed_results(results, output_file):
    folder_name = './all_FAILed_solutions_chatgpt'
    if not os.path.exists(folder_name):
        os.makedirs(folder_name)

    final_name = folder_name + '/' + output_file
    with open(final_name, 'w', encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f"Saved failed !! results to {final_name}")

def main():
    # input_file = "question_675_shuffled.json"
    # output_file = "tmp.json"
    
    for input_file in filtered_files:
        print("Reading questions and answers...")
        QandAs = read_questions_and_answers(input_file) #112个字典

        # input_file 'deptAnswers.01.AE_shuffled.json'
        output_file = input_file.replace("deptAnswers", "chatgpt_4o.rate")
        # output_file 'deepseek_671.rate.01.AE_shuffled.json'

        print(f"will output to [{output_file}]")
        print("Processing questions...")
        # Clear output file before starting
        thisDept = deptDict[input_file[12:14]] #中文
        print(f"thisDept=[{thisDept}]")
        # open(output_file, 'w').close()

        results,failed_qid = process_questions_and_answers(QandAs, output_file, thisDept)
    
        print("Saving results...")
        save_results(results, output_file)
        print('Saving failed QID')
        save_failed_results(failed_qid, output_file)

    
    print(f"Completed!")

if __name__ == "__main__":
    main()
