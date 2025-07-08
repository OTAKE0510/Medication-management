graph TD
    A[利用者] --&gt; B(薬を管理する)
    B --&gt; B1(&lt;&lt;include&gt;&gt;<br>薬・サプリを登録する)
    B --&gt; B2(&lt;&lt;include&gt;&gt;<br>登録情報を編集する)
    B --&gt; B3(&lt;&lt;include&gt;&gt;<br>登録情報を削除する)
    A --&gt; C(服薬を記録する)
    A --&gt; D(服薬履歴を確認する)
    A --&gt; E(効果を記録する)
    F[システム] --&gt; A
    subgraph System
      B
      C
      D
      E
      F(リマインダーを通知する)
    end

    classDef include fill:#f9f,stroke:#333,stroke-width:2px;
    class B1,B2,B3 include
    