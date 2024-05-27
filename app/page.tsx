"use client"
import { Zip, ZipDeflate, strToU8 } from "fflate";
import { Cards } from 'scryfall-api';
import { FileUploader } from "react-drag-drop-files";
import { File } from "buffer";
import { useState } from "react";

import "./style.css";
import { AwesomeButton, AwesomeButtonProgress } from "react-awesome-button";
import 'react-awesome-button/dist/styles.css';
import Loading from "react-loading";

export default function Page() {


  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState<string>("");
  const [sideboard, setSideboard] = useState(false);
  const [maybeboard, setMaybeboard] = useState(false)
  const [lands, setLands] = useState(false)
  const [processed, setProcessed] = useState<number | null>(null);

  const download = (filename, blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    setProcessed(null);
    a.click();
    if (!file) return;
  }


  const handleFile = async (file: File) => {
    console.log("file", file);
    let buff = Buffer.from(await file.arrayBuffer());
    let uint = new Uint8Array(buff);
    let str = new TextDecoder().decode(uint);
    setText(str);
  }



  const generateZip = async (callback) => {

    console.log("generateZip")
    let processedZipStreams = [];


    var a = new Zip((err, dat, final) => {
      processedZipStreams.push(dat);
      if (final) {
        download("deck.zip", new Blob(processedZipStreams));
      }
    });

    let lines = text.split("\n");
    setProcessed(0);
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      if (line.trim() == "") continue;
      if (line.indexOf("MAYBEBOARD") != -1 || line.indexOf("SIDEBOARD") != -1) {
        break;
      }

      let parts = line.split(" ");

      if (parts.length < 4) continue;


      /*
1 Anafenza, Kin-Tree Spirit (CMM) 11
1 Andúril, Narsil Reforged (LTC) 491
1 Anguished Unmaking (2X2) 170
1 Arcane Signet (OTC) 252
1 Arwen, Weaver of Hope (LTC) 35
Emmara, Soul of the Accord (PLST) GRN-168
*/
      let regex = /(\(.{2,4}\)) (.{0,3}-?\d+)/;
      let set = regex.exec(line)[1].replace("(", "").replace(")", "").toLowerCase();
      let collectorNumberaux = regex.exec(line)[2]
      let collectorNumber = -1;
      if (collectorNumberaux.indexOf("-") != -1) {
        let aux = collectorNumberaux.split("-");
        collectorNumber = parseInt(aux[1]);
        set = aux[0].toLowerCase();
      } else {
        collectorNumber = parseInt(collectorNumberaux);
      }

      let card = await Cards.bySet(set, collectorNumber)
      let isLand = card.type_line.indexOf("Land") != -1;
      if (isLand && !lands) continue;
      let imageUrl = card.image_uris.png;
      let name = card.name.replace(/[^a-z0-9_-]/gi, '_').toLowerCase()
      let response = await fetch(imageUrl);
      let blob = await response.blob();
      let buff = Buffer.from(await blob.arrayBuffer());
      let uint = new Uint8Array(buff);
      let b = new ZipDeflate(`${set}-${collectorNumber}-${name}.png`);
      setProcessed(i);
      a.add(b);
      b.push(uint, true);
    }
    a.end();
    callback();
  }






  return <main>
    <div className="header">
      <h1>Gatherer</h1>
    </div>
    <div className="input">
      {processed == null && <div className="uploadOrType">
        <FileUploader handleChange={(files) => handleFile(files)} >
          <div className="dragAndDrop">
            <p>Drag and drop your decklist here</p>
          </div>
        </FileUploader>
        <textarea placeholder="Or type it here..." spellCheck="false" className="text" value={text} onChange={(e) => setText(e.target.value)}></textarea>
      </div>}
      {processed != null &&
       <div className="progress"> 
          <p>Processed {processed} cards</p>
          <Loading type="cylon" color="black"/>
      </div>}
      <div className="options">
        <label className={sideboard ? "selected" : ""}>
          <input type="checkbox" checked={sideboard} onChange={(e) => setSideboard(e.target.checked)} />
          Include Sideboard
        </label>
        <label className={maybeboard ? "selected" : ""}>
          <input type="checkbox" checked={maybeboard} onChange={(e) => setMaybeboard(e.target.checked)} />
          Include Maybeboard
        </label>
        <label className={lands ? "selected" : ""}>
          <input type="checkbox" checked={lands} onChange={(e) => setLands(e.target.checked)} />
          Include Basic Lands
        </label>
      </div>



      <AwesomeButtonProgress  type="primary" onPress={(event, release ) => generateZip(release)}>Generate Zip</AwesomeButtonProgress>
    </div>

  </main>
}


