-- Database initialization for MCP Meta-Analysis Server
-- Creates tables for persistent session storage and scaling

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Sessions table for persistent storage
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(255) UNIQUE NOT NULL,
    project_name VARCHAR(500) NOT NULL,
    study_type VARCHAR(100) NOT NULL,
    effect_measure VARCHAR(10) NOT NULL,
    analysis_model VARCHAR(50) DEFAULT 'auto',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'active',
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Studies table for uploaded data
CREATE TABLE IF NOT EXISTS studies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(255) REFERENCES sessions(session_id) ON DELETE CASCADE,
    study_name VARCHAR(500) NOT NULL,
    study_data JSONB NOT NULL,
    validation_status VARCHAR(50) DEFAULT 'pending',
    validation_errors JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Analysis results table
CREATE TABLE IF NOT EXISTS analysis_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(255) REFERENCES sessions(session_id) ON DELETE CASCADE,
    effect_measure VARCHAR(10) NOT NULL,
    model_type VARCHAR(50) NOT NULL,
    confidence_level DECIMAL(3,2) DEFAULT 0.95,
    results JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    execution_time_ms INTEGER,
    r_version VARCHAR(50),
    packages_used JSONB DEFAULT '[]'::jsonb
);

-- Generated files table (plots, reports)
CREATE TABLE IF NOT EXISTS generated_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(255) REFERENCES sessions(session_id) ON DELETE CASCADE,
    file_type VARCHAR(50) NOT NULL, -- 'forest_plot', 'funnel_plot', 'report'
    file_format VARCHAR(10) NOT NULL, -- 'png', 'pdf', 'html'
    file_path VARCHAR(1000) NOT NULL,
    file_size INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Publication bias assessments table
CREATE TABLE IF NOT EXISTS publication_bias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(255) REFERENCES sessions(session_id) ON DELETE CASCADE,
    methods VARCHAR(100)[] NOT NULL, -- ['egger', 'begg', 'funnel']
    results JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Server metrics table for monitoring
CREATE TABLE IF NOT EXISTS server_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    server_id VARCHAR(100) NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(10,2) NOT NULL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at);

CREATE INDEX IF NOT EXISTS idx_studies_session_id ON studies(session_id);
CREATE INDEX IF NOT EXISTS idx_studies_validation_status ON studies(validation_status);

CREATE INDEX IF NOT EXISTS idx_analysis_results_session_id ON analysis_results(session_id);
CREATE INDEX IF NOT EXISTS idx_analysis_results_created_at ON analysis_results(created_at);

CREATE INDEX IF NOT EXISTS idx_generated_files_session_id ON generated_files(session_id);
CREATE INDEX IF NOT EXISTS idx_generated_files_file_type ON generated_files(file_type);

CREATE INDEX IF NOT EXISTS idx_publication_bias_session_id ON publication_bias(session_id);

CREATE INDEX IF NOT EXISTS idx_server_metrics_server_id ON server_metrics(server_id);
CREATE INDEX IF NOT EXISTS idx_server_metrics_recorded_at ON server_metrics(recorded_at);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sessions_updated_at 
    BEFORE UPDATE ON sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Views for common queries
CREATE OR REPLACE VIEW session_summary AS
SELECT 
    s.session_id,
    s.project_name,
    s.study_type,
    s.effect_measure,
    s.status,
    s.created_at,
    COUNT(st.id) as study_count,
    COUNT(ar.id) as analysis_count,
    COUNT(gf.id) as file_count
FROM sessions s
LEFT JOIN studies st ON s.session_id = st.session_id
LEFT JOIN analysis_results ar ON s.session_id = ar.session_id
LEFT JOIN generated_files gf ON s.session_id = gf.session_id
GROUP BY s.session_id, s.project_name, s.study_type, s.effect_measure, s.status, s.created_at;

CREATE OR REPLACE VIEW recent_analyses AS
SELECT 
    ar.session_id,
    s.project_name,
    ar.effect_measure,
    ar.model_type,
    ar.results->>'overall_effect' as overall_effect,
    ar.execution_time_ms,
    ar.created_at
FROM analysis_results ar
JOIN sessions s ON ar.session_id = s.session_id
ORDER BY ar.created_at DESC
LIMIT 100;

-- Sample data for testing (optional)
-- INSERT INTO sessions (session_id, project_name, study_type, effect_measure) 
-- VALUES ('test-session-001', 'Sample Meta-Analysis', 'clinical_trial', 'OR');

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO meta_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO meta_user;