# AI Pack (RL, train_roles GENS=18)
- Result: 6 neural MLP tanks written to result/ai.txt
- Eval seeds: 2000..2011 (12 games)
- Score: 12 wins, 0 draws (score=12)
- Avg end tick: ~287.8
- Final roles: [DEALER, DEALER, NORMAL, DEALER, TANKER, DEALER] (ids: [2,2,0,2,1,2])
- Names: Atlas, Bulwark, Viper, Falcon, Raptor, Sage
- Model: shared per-type 16→6→5 MLP, inputs include pos/health/enemy-centroid/ally-centroid/bullet-evade/wall-avoid/type one-hot, outputs mix weights + aim lead
- Next: extend opponent pool, more gens, multi-objective

