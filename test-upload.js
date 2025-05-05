// Teste para verificar a funcionalidade de upload e recuperação de arquivos

const uploadFile = async () => {
  // Criar um arquivo de teste
  const fs = require("fs");
  const path = require("path");

  const testFilePath = path.join(__dirname, "test-file.txt");
  fs.writeFileSync(testFilePath, "Teste de upload de arquivo");

  // Criar um FormData para o upload
  const FormData = require("form-data");
  const axios = require("axios");
  const formData = new FormData();

  formData.append("files", fs.createReadStream(testFilePath));

  try {
    // Fazer o upload do arquivo
    console.log("Enviando arquivo...");
    const uploadResponse = await axios.post(
      "http://localhost:3000/api/add-files",
      formData,
      {
        headers: {
          ...formData.getHeaders(),
        },
      }
    );

    const uploadedFiles = uploadResponse.data;
    console.log("Arquivo enviado com sucesso:", uploadedFiles);

    if (uploadedFiles.length === 0) {
      console.error("Nenhum arquivo foi enviado");
      return;
    }

    // Recuperar o arquivo
    const fileUri = uploadedFiles[0].uri;
    console.log("Tentando recuperar o arquivo com URI:", fileUri);

    const loadResponse = await axios.post(
      "http://localhost:3000/api/load-files",
      {
        uris: [fileUri],
      }
    );

    console.log("Arquivo recuperado com sucesso:", loadResponse.data);

    // Limpar o arquivo de teste
    fs.unlinkSync(testFilePath);
  } catch (error) {
    console.error(
      "Erro durante o teste:",
      error.response?.data || error.message
    );
  }
};

uploadFile();
