/* eslint-disable @typescript-eslint/no-unused-vars */
import csvParse from 'csv-parse';
import fs from 'fs';

import { getCustomRepository, getRepository, In } from 'typeorm';
import Transaction from '../models/Transaction';
import Category from '../models/Category';
import TransactionsRepository from '../repositories/TransactionsRepository';

interface TransactionCSV {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute(filePath: string): Promise<Transaction[]> {
    const contactsReadStream = fs.createReadStream(filePath); // Vai ler o arquivo do caminho
    const categoriesRepository = getRepository(Category);
    const transactionsRepository = getCustomRepository(TransactionsRepository);

    const parsers = csvParse({
      // A primeira linha começa de 1 e não zero
      from_line: 2, // Ignora-se a linha 1 e inicia no 2 pois a 1 é apenas o título
    });

    const parseCSV = contactsReadStream.pipe(parsers); // Leia as linhas de 1 por 1 apartir do ( )

    const transactions: TransactionCSV[] = [];
    const categories: string[] = [];

    parseCSV.on('data', async line => {
      // Para cada linha lida, desestruture, e execute a função
      const [title, type, value, category] = line.map((cell: string) =>
        cell.trim(),
      );

      if (!title || !type || !value) return; // Caso alguma transação não tenha algum desses atributos ele não executa

      categories.push(category);
      transactions.push({ title, type, value, category });
    });
    await new Promise(resolve => parseCSV.on('end', resolve)); // Aguarda a função parseSCV chegar ao fim

    const existentCategories = await categoriesRepository.find({
      // Retorna do banco as cartegorias semelhantes as informadas que existem
      where: {
        title: In(categories), // Função (In) serve para enviar várias informações para serem testadas
      },
    });

    const existentCategoriesTitles = existentCategories.map(
      (category: Category) => category.title, // Retorna todos os titulos das cartegorias existentes
    );

    const addCategoryTitle = categories
      .filter(
        // Verifica as cartegorias enviadas com as resgatadas do banco de dados
        category => !existentCategoriesTitles.includes(category),
        // Retorna todas os titulos das category que não foram encontradas do banco de dados
      )
      .filter((value, index, self) => self.indexOf(value) === index); // Mapeia a string e retira os valores repetidos

    const newCategories = categoriesRepository.create(
      // Cria as tabelas no banco de dados
      addCategoryTitle.map(title => ({
        // Desestrutura o array enviando um objeto com o titulo para cada
        title,
      })),
    );
    await categoriesRepository.save(newCategories);

    const finalCategories = [...existentCategories, ...newCategories];

    const createTransactions = transactionsRepository.create(
      transactions.map(transaction => ({
        title: transaction.title,
        type: transaction.type,
        value: transaction.value,
        category: finalCategories.find(
          // Percorre o array final com todas as category
          category => category.title === transaction.category, // Retorna o id da category que tinha titulo igual
        ),
      })),
    );

    await transactionsRepository.save(createTransactions);

    await fs.promises.unlink(filePath); // Apaga o arquivo que foi lido

    return createTransactions;
  }
}

export default ImportTransactionsService;
