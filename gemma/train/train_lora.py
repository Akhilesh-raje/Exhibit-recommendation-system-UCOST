import argparse
from datasets import load_dataset
from transformers import AutoTokenizer, AutoModelForCausalLM, Trainer, TrainingArguments, DataCollatorForLanguageModeling
from peft import LoraConfig, get_peft_model

def format_example(ex):
    # Build simple instruction prompt
    ctx = ex.get('context') or {}
    instr = ex.get('instruction') or 'Recommend exhibits'
    prompt = f"Instruction: {instr}\nContext: {ctx}\nResponse:"
    return prompt

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--model', default='google/gemma-2b')
    parser.add_argument('--data', default='gemma/data/exhibits.jsonl')
    args = parser.parse_args()

    tok = AutoTokenizer.from_pretrained(args.model)
    if tok.pad_token is None:
        tok.pad_token = tok.eos_token
    model = AutoModelForCausalLM.from_pretrained(args.model)
    peft_cfg = LoraConfig(r=8, lora_alpha=16, lora_dropout=0.05, target_modules=['q_proj','v_proj'])
    model = get_peft_model(model, peft_cfg)

    ds = load_dataset('json', data_files=args.data, split='train')
    def tok_fn(batch):
        texts = [format_example(x) for x in batch]
        return tok(texts, truncation=True, max_length=1024)
    tokenized = ds.map(lambda x: tok_fn(x), batched=False, remove_columns=ds.column_names)

    args_tr = TrainingArguments(
        output_dir='gemma/out',
        per_device_train_batch_size=2,
        num_train_epochs=1,
        learning_rate=2e-4,
        fp16=False,
        logging_steps=50,
        save_steps=500,
        save_total_limit=1
    )
    collator = DataCollatorForLanguageModeling(tokenizer=tok, mlm=False)
    trainer = Trainer(
        model=model,
        args=args_tr,
        train_dataset=tokenized,
        data_collator=collator
    )
    trainer.train()
    model.save_pretrained('gemma/out/adapter')
    tok.save_pretrained('gemma/out/adapter')
    print('Training complete. Adapter saved to gemma/out/adapter')

if __name__ == '__main__':
    main()


