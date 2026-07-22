/**
 * HTTP katmani. Kullanici id'sini req.user.id'den alir - govdeden ASLA almaz,
 * yoksa kullanici baskasi adina link olusturabilir.
 */
const linksService = require('./links.service');

async function createLink(req, res) {
  const link = await linksService.createLink({ userId: req.user.id, ...req.body });
  res.status(201).json(link);
}

async function listLinks(req, res) {
  const links = await linksService.listLinks(req.user.id);
  res.status(200).json({ links });
}

async function getStats(req, res) {
  const stats = await linksService.getStats(req.params.id, req.user.id);
  res.status(200).json(stats);
}

async function deleteLink(req, res) {
  await linksService.deleteLink(req.params.id, req.user.id);
  res.status(204).send();
}

module.exports = { createLink, listLinks, getStats, deleteLink };
