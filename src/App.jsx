import { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [studyNotes, setStudyNotes] = useState([]);
  const [form, setForm] = useState({
    title: "",
    category: "",
    summary: "",
    content: "",
    example_code: "",
    memo: "",
  });

  const fetchStudyNotes = async () => {
    const res = await axios.get("http://localhost:8081/api/study-notes");
    setStudyNotes(res.data.data);
  };

  useEffect(() => {
    fetchStudyNotes();
  }, []);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    await axios.post("http://localhost:8081/api/study-notes", form);

    setForm({
      title: "",
      category: "",
      summary: "",
      content: "",
      example_code: "",
      memo: "",
    });

    fetchStudyNotes();
  };

  return (
    <div className="container">
      <h1>Study Note</h1>

      <form onSubmit={handleSubmit}>
        <input
          name="title"
          placeholder="タイトル"
          value={form.title}
          onChange={handleChange}
        />

        <input
          name="category"
          placeholder="カテゴリ"
          value={form.category}
          onChange={handleChange}
        />

        <textarea
          name="summary"
          placeholder="ざっくり説明"
          value={form.summary}
          onChange={handleChange}
        />

        <textarea
          name="content"
          placeholder="詳しい内容"
          value={form.content}
          onChange={handleChange}
        />

        <textarea
          name="example_code"
          placeholder="コード例"
          value={form.example_code}
          onChange={handleChange}
        />

        <textarea
          name="memo"
          placeholder="メモ"
          value={form.memo}
          onChange={handleChange}
        />

        <button type="submit">登録</button>
      </form>

      <hr />

      {studyNotes.map((note) => (
        <div key={note.id} className="card">
          <h2>{note.title}</h2>
          <p>{note.category}</p>
          <p>{note.summary}</p>
        </div>
      ))}
    </div>
  );
}

export default App;
