const validateBooking = (req, res, next) => {
  const { name, phone, service, date } = req.body;
  const errors = [];
  if (!name || name.trim().length < 2)              errors.push('name required');
  if (!phone || phone.replace(/\D/g,'').length < 7) errors.push('valid phone required');
  if (!service || service.trim() === '')             errors.push('service required');
  if (!date || isNaN(new Date(date)))                errors.push('valid date required');
  if (errors.length) return res.status(400).json({ error: errors.join('; ') });
  next();
};

const validateJob = (req, res, next) => {
  const { customer_id, service_id, job_date } = req.body;
  const errors = [];
  if (!customer_id || isNaN(Number(customer_id))) errors.push('valid customer_id required');
  if (!service_id  || isNaN(Number(service_id)))  errors.push('valid service_id required');
  if (!job_date    || isNaN(new Date(job_date)))   errors.push('valid job_date required');
  if (errors.length) return res.status(400).json({ error: errors.join('; ') });
  next();
};

const validateCustomer = (req, res, next) => {
  const { name, phone } = req.body;
  const errors = [];
  if (!name  || name.trim().length < 2)              errors.push('name required');
  if (!phone || phone.replace(/\D/g,'').length < 7)  errors.push('valid phone required');
  if (errors.length) return res.status(400).json({ error: errors.join('; ') });
  next();
};

module.exports = { validateBooking, validateJob, validateCustomer };
