"use client"
import { useRouter } from "next/navigation"
import  Header  from "@/components/Header"
import  Footer  from "@/components/Footer"



export default function Dashboard() {

  //後日追加、セッションが切れていたらログイン画面へ

  return(
    <>
      <Header/>
      <section>
        <div>ダッシュボード</div>
      </section>
      <Footer/>
    </>
  );
}
