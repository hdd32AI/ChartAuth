import json
from pathlib import Path
from tempfile import TemporaryDirectory
from harbor_evaluator import evaluate

with TemporaryDirectory(prefix="alaska-verifier-audit-") as tmp:
    root = Path(tmp)
    pool_ids = [f"NCT{i:08d}" for i in range(1, 302)]
    gold_ids = pool_ids[:4]
    (root / "gold.txt").write_text("\n".join(gold_ids))
    (root / "pool.txt").write_text("\n".join(pool_ids))
    cases = {
        "exact_gold": gold_ids,
        "50_picks_with_4_gold": pool_ids[:50],
        "whole_pool_gold_first": pool_ids,
        "whole_pool_gold_last": pool_ids[4:] + gold_ids,
        "negative_statements": [f"Patient is NOT eligible for {nct}" for nct in gold_ids],
        "gold_plus_out_of_pool": gold_ids + [f"NCT{i:08d}" for i in range(1000, 1100)],
    }
    results = []
    for name, predictions in cases.items():
        submission = root / f"{name}.txt"
        submission.write_text("\n".join(predictions))
        logs = root / name
        reward = evaluate(submission, root / "gold.txt", root / "pool.txt", logs)
        metrics = json.loads((logs / "metrics.json").read_text())
        results.append({
            "case": name,
            "reward": reward,
            "precision": metrics["precision"],
            "recall_top_50": metrics["recall_top_50"],
            "n_predicted": metrics["n_predicted"],
            "discarded_outside_pool": metrics["n_discarded_outside_pool"],
        })
    assert [r["reward"] for r in results] == [1., 1., 1., 0., 1., 1.]
    print(json.dumps(results, indent=2))

